require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const next = require('next');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const SESSION_SECRET = process.env.SESSION_SESSION_SECRET || 'your-secret-key';

// Ensure required directories exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory:', dataDir);
}

const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
  console.log('Created sessions directory:', sessionsDir);
}

// Initialize and open the database; create tables if needed
async function initDb() {
  const dbPath = path.join(dataDir, 'mydatabase.db');
  console.log("Database path:", dbPath);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Create users table (if it doesn't exist) with bettingAmount included. UPDATE
  await db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT,
    flag TEXT,
    displayName TEXT,
    totalPoints INTEGER DEFAULT 0,
    goldMedals INTEGER DEFAULT 0,
    bettingAmount INTEGER DEFAULT 50
  )`);

  // If the table already exists, try to add bettingAmount (ignore error if it exists)
  try {
    await db.run("ALTER TABLE users ADD COLUMN bettingAmount INTEGER DEFAULT 50");
  } catch (err) {
    // Column likely exists already; ignore the error.
  }

  // Create events table (include moneyLine columns)
  await db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    date TEXT,
    time TEXT,
    participants TEXT,
    moneyLine1 REAL,
    moneyLine2 REAL
  )`);

  // Create bets table
  await db.run(`CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_id INTEGER,
    predicted_winner TEXT,
    wager_amount REAL,
    result TEXT
  )`);

  // Create images table
  await db.run(`CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    image_path TEXT,
    upload_time TEXT
  )`);

  // Create event results table
  await db.run(`CREATE TABLE IF NOT EXISTS event_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    user_id INTEGER,
    position INTEGER,
    points INTEGER,
    gold_medals INTEGER DEFAULT 0,
    UNIQUE(event_id, user_id)
  )`);

    await db.run(`
    CREATE TABLE IF NOT EXISTS special_bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT,
      odds REAL,
      created_by INTEGER
    )
  `);

  return db;
}

// Set up multer storage for flag uploads
const flagStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public', 'flags'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const flagUpload = multer({ storage: flagStorage });

// Set up multer storage for explore photo uploads
const exploreStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public', 'explore'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const exploreUpload = multer({ storage: exploreStorage });

// Middleware to check if the request is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Middleware to check for admin role
function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  } else {
    res.status(403).send('Forbidden: Admins Only');
  }
}

app.prepare().then(async () => {
  const server = express();
  const db = await initDb();

  server.use(
    session({
      store: new SQLiteStore({ db: 'sessions.sqlite', dir: './sessions' }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    })
  );

  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));
  server.use(express.static(path.join(__dirname, 'public')));

  // Health check endpoint
  server.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Signup endpoint
  server.post('/api/signup', async (req, res) => {
    const { username, password, adminCode, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Missing username or password' });
    }
    const role = adminCode === 'Skye' ? 'admin' : 'user';
    try {
      const existingUser = await db.get('SELECT * FROM users WHERE username = ?', username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username already exists' });
      }
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      await db.run(
        `INSERT INTO users (username, password_hash, role, displayName) VALUES (?, ?, ?, ?)`,
        username,
        password_hash,
        role,
        displayName
      );
      res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Login endpoint
  server.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Missing username or password' });
    }
    try {
      const user = await db.get('SELECT * FROM users WHERE username = ?', username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
      };
      res.json({ message: 'Login successful' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Logout endpoint
  server.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
  });

  // Flag upload endpoint
  server.post('/api/upload/flag', isAuthenticated, flagUpload.single('flag'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded for flag.' });
    }
    const filePath = `/flags/${req.file.filename}`;
    try {
      await db.run('UPDATE users SET flag = ? WHERE id = ?', filePath, req.session.user.id);
      res.status(200).json({ message: 'Flag uploaded successfully', filePath });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Explore photo upload endpoint
  server.post('/api/upload/explore', isAuthenticated, exploreUpload.single('photo'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded for explore photo.' });
    }
    const filePath = `/explore/${req.file.filename}`;
    try {
      await db.run(
        'INSERT INTO images (user_id, image_path, upload_time) VALUES (?, ?, ?)',
        req.session.user.id,
        filePath,
        new Date().toISOString()
      );
      res.status(200).json({ message: 'Explore photo uploaded successfully', filePath });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get profile endpoint (returns displayName, flag, bettingAmount, etc.)
  server.get('/api/profile', isAuthenticated, async (req, res) => {
    try {
      const user = await db.get(
        'SELECT displayName, flag, bettingAmount, goldMedals, totalPoints FROM users WHERE id = ?',
        req.session.user.id
      );
      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update profile endpoint
  server.post('/api/profile/update', isAuthenticated, async (req, res) => {
    const { displayName, flag } = req.body;
    try {
      await db.run('UPDATE users SET displayName = ?, flag = ? WHERE id = ?', displayName, flag, req.session.user.id);
      res.json({ message: 'Profile updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get photos for the current user
  server.get('/api/photos', isAuthenticated, async (req, res) => {
    try {
      const photos = await db.all('SELECT image_path FROM images WHERE user_id = ?', req.session.user.id);
      res.json(photos.map(photo => photo.image_path));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // GET /api/explore/all-photos endpoint (with pagination)
  server.get('/api/explore/all-photos', isAuthenticated, async (req, res) => {
    try {
      const limit = 20;
      const offset = parseInt(req.query.offset) || 0;
      const currentUserId = req.session.user.id;
      const photos = await db.all(
        `SELECT images.image_path, users.flag AS user_flag, users.displayName AS username, images.upload_time
         FROM images
         LEFT JOIN users ON images.user_id = users.id
         WHERE images.user_id != ?
         ORDER BY images.upload_time DESC
         LIMIT ? OFFSET ?`,
        currentUserId,
        limit,
        offset
      );
      res.json({
        photos: photos,
        hasMore: photos.length === limit
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // GET /api/users endpoint: returns a list of users
  server.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await db.all('SELECT id, username, displayName, flag, totalPoints, goldMedals FROM users');
      res.json({ users });
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

server.get('/api/events', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const events = await db.all(
      "SELECT id, title, date, time, moneyLine1, moneyLine2, participants FROM events"
    );
    res.json({ events });
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


  // Add Event endpoint (admin only)
  server.post('/api/events/add', isAuthenticated, isAdmin, async (req, res) => {
    const { title, description, date, time, participants } = req.body;
    if (!title || !date || !time) {
      return res.status(400).json({ message: 'Missing required event fields' });
    }
    try {
      await db.run(
        'INSERT INTO events (title, description, date, time, participants) VALUES (?, ?, ?, ?, ?)',
        title,
        description,
        date,
        time,
        participants
      );
      res.json({ message: 'Event added successfully' });
    } catch (err) {
      console.error("Error adding event:", err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // GET /api/events/today endpoint: returns events scheduled for today
  server.get('/api/events/today', isAuthenticated, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const events = await db.all('SELECT * FROM events WHERE date = ?', today);
      res.json({ events });
    } catch (err) {
      console.error("Error fetching today's events:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/schedule endpoint: returns schedule events with names and participant names
  server.get('/api/schedule', isAuthenticated, async (req, res) => {
    try {
      const events = await db.all('SELECT * FROM events');
      const eventsWithNames = await Promise.all(events.map(async ev => {
        const eventDescription = ev.description && ev.description.trim().length > 0 ? ev.description : ev.title;
        let participantNames = [];
        if (ev.participants) {
          const ids = ev.participants.split(',').map(p => p.trim()).filter(p => p.length > 0);
          if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            const users = await db.all(
              `SELECT id, displayName, username FROM users WHERE id IN (${placeholders})`,
              ...ids
            );
            participantNames = users.map(u => u.displayName || u.username);
          }
        }
        return { ...ev, name: ev.title, description: eventDescription, participants: participantNames };
      }));
      res.json({ events: eventsWithNames });
    } catch (err) {
      console.error("Error fetching schedule events:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Leaderboards endpoint: returns users with their overall totals
  server.get('/api/leaderboards', isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await db.all(`
        SELECT 
          id,
          username, 
          displayName,
          flag,
          totalPoints,
          goldMedals
        FROM users
        ORDER BY totalPoints DESC
      `);
      res.json({ leaderboard });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

server.post('/api/events/edit', isAuthenticated, isAdmin, async (req, res) => {
  const {
    eventId,
    title,
    description,
    date,
    time,
    participants,
    moneyLine1,
    moneyLine2,
    moneyLine3,
    moneyLine4
  } = req.body;

  // Log the payload received from the client
  console.log("Received update payload:", req.body);

  if (!eventId || !title) {
    console.log("Missing event ID or title");
    return res.status(400).json({ message: "Missing event ID or title" });
  }

  try {
    const result = await db.run(
      "UPDATE events SET title = ?, description = ?, date = ?, time = ?, participants = ?, moneyLine1 = ?, moneyLine2 = ?, moneyLine3 = ?, moneyLine4 = ? WHERE id = ?",
      title,
      description,
      date,
      time,
      participants,
      moneyLine1,
      moneyLine2,
      moneyLine3,
      moneyLine4,
      eventId
    );
    console.log("Update result:", result);
    res.json({ message: "Event updated successfully" });
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});







  // POST /api/totals/edit endpoint (admin only)
  server.post('/api/totals/edit', isAuthenticated, isAdmin, async (req, res) => {
    const { updates } = req.body; // Expect an array of { userId, points, goldMedals } delta values
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ message: 'Invalid updates payload' });
    }
    try {
      for (const upd of updates) {
        const { userId, points, goldMedals } = upd;
        if (!userId) continue;
        await db.run(
          'UPDATE users SET totalPoints = totalPoints + ?, goldMedals = goldMedals + ? WHERE id = ?',
          points,
          goldMedals,
          userId
        );
      }
      res.json({ message: 'User totals updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // POST /api/bet endpoint with updated betting logic:
  server.post('/api/bet', isAuthenticated, async (req, res) => {
    const { eventId, predicted_winner, wager_amount } = req.body;
    if (!eventId || !predicted_winner || !wager_amount) {
      return res.status(400).json({ message: "Missing required bet information" });
    }
    const wager = parseFloat(wager_amount);
    if (isNaN(wager) || wager <= 0) {
      return res.status(400).json({ message: "Invalid wager amount" });
    }
    try {
      // Check current betting funds
      const user = await db.get('SELECT bettingAmount FROM users WHERE id = ?', req.session.user.id);
      if (!user || user.bettingAmount < wager) {
        return res.status(400).json({ message: "Insufficient betting funds" });
      }
      
      await db.run("BEGIN TRANSACTION");
      
      // Insert the bet
      await db.run(
        "INSERT INTO bets (user_id, event_id, predicted_winner, wager_amount) VALUES (?, ?, ?, ?)",
        req.session.user.id,
        eventId,
        predicted_winner,
        wager
      );
      
      // Deduct the wager from the user's betting funds
      await db.run(
        "UPDATE users SET bettingAmount = bettingAmount - ? WHERE id = ?",
        wager,
        req.session.user.id
      );
      
      await db.run("COMMIT");
      res.json({ message: "Bet placed successfully" });
    } catch (err) {
      await db.run("ROLLBACK");
      console.error("Error placing bet:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

server.get('/api/betting', isAuthenticated, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const oneWeekAhead = new Date();
    oneWeekAhead.setDate(oneWeekAhead.getDate() + 7);
    const weekDate = oneWeekAhead.toISOString().split("T")[0];

    // Get events in the date range.
    const events = await db.all(
      "SELECT * FROM events WHERE date BETWEEN ? AND ? ORDER BY date ASC, time ASC",
      today,
      weekDate
    );

    // For each event, convert the comma-separated participant IDs
    // into an array of participant names by joining with the users table.
    const eventsWithNames = await Promise.all(
      events.map(async (ev) => {
        let participants = [];
        if (ev.participants) {
          const pids = ev.participants.split(",").map(p => p.trim());
          if (pids.length > 0) {
            const placeholders = pids.map(() => '?').join(',');
            const users = await db.all(
              `SELECT id, displayName, username FROM users WHERE id IN (${placeholders})`,
              ...pids
            );
            // For each ID from the event, find the matching user and return display name.
            participants = pids.map(pid => {
              const user = users.find(u => String(u.id) === pid);
              return user ? (user.displayName || user.username) : pid;
            });
          }
        }
        return {
          id: ev.id,
          title: ev.title,
          date: ev.date,
          time: ev.time,
          // Include all moneyline columns if you have up to four.
          moneyLine1: ev.moneyLine1,
          moneyLine2: ev.moneyLine2,
          moneyLine3: ev.moneyLine3,
          moneyLine4: ev.moneyLine4,
          participants,  // This is now an array of names.
        };
      })
    );

    res.json({ events: eventsWithNames });
  } catch (err) {
    console.error("Error fetching betting events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


server.get('/api/bets/all', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const bets = await db.all(`
      SELECT 
        b.id, 
        b.user_id, 
        u.username, 
        b.event_id, 
        e.title AS eventTitle, 
        b.predicted_winner, 
        b.wager_amount, 
        e.moneyLine1 AS moneyline
      FROM bets b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN events e ON b.event_id = e.id
    `);
    res.json({ bets });
  } catch (err) {
    console.error("Error fetching bets:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


server.post('/api/bets/adminAdjust', isAuthenticated, isAdmin, async (req, res) => {
  const { betId, userId, delta } = req.body;
  if (!betId || !userId || delta == null) {
    return res.status(400).json({ message: "Missing required parameters." });
  }
  try {
    await db.run("UPDATE users SET bettingAmount = bettingAmount + ? WHERE id = ?", delta, userId);
    res.json({ message: "Adjustment applied successfully." });
  } catch (err) {
    console.error("Error applying bet adjustment:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

    // DELETE endpoint for events
    server.delete('/api/events/delete', isAuthenticated, isAdmin, async (req, res) => {
        const { eventId } = req.body;
        if (!eventId) {
            return res.status(400).json({ message: 'Missing event ID.' });
        }
        try {
            await db.run('DELETE FROM events WHERE id = ?', eventId);
            res.json({ message: 'Event deleted successfully.' });
        } catch (err) {
            console.error("Error deleting event:", err);
            res.status(500).json({ message: 'Internal server error.' });
        }
    });

    // DELETE endpoint for bets
    server.delete('/api/bets/delete', isAuthenticated, isAdmin, async (req, res) => {
        const { betId } = req.body;
        if (!betId) {
            return res.status(400).json({ message: 'Missing bet ID.' });
        }
        try {
            await db.run('DELETE FROM bets WHERE id = ?', betId);
            res.json({ message: 'Bet deleted successfully.' });
        } catch (err) {
            console.error("Error deleting bet:", err);
            res.status(500).json({ message: 'Internal server error.' });
        }
    });

    // POST /api/bet/special endpoint for special bets
    server.post('/api/bet/special', isAuthenticated, async (req, res) => {
        const { eventId, predicted_winner, wager_amount } = req.body;
        // eventId will be 0 to denote a special bet.
        // Here, we don't deduct funds.
        try {
            await db.run(
                "INSERT INTO bets (user_id, event_id, predicted_winner, wager_amount) VALUES (?, ?, ?, ?)",
                req.session.user.id,
                eventId,
                predicted_winner,
                wager_amount
            );
            res.json({ message: "Special bet placed successfully." });
        } catch (err) {
            console.error("Error placing special bet:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    server.post('/api/specialbets/add', isAuthenticated, isAdmin, async (req, res) => {
        const { description, odds } = req.body;
        if (!description || !odds) {
            return res.status(400).json({ message: "Missing description or odds." });
        }

        try {
            await db.run(
                "INSERT INTO special_bets (description, odds, created_by) VALUES (?, ?, ?)",
                description,
                odds,
                req.session.user.id
            );
            res.json({ message: "Special bet created successfully." });
        } catch (err) {
            console.error("Error creating special bet:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    });


    server.get('/api/specialbets', isAuthenticated, async (req, res) => {
        try {
            const rows = await db.all("SELECT * FROM special_bets");
            // Return them in a JSON structure
            res.json({ specialBets: rows });
        } catch (err) {
            console.error("Error fetching special bets:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    });


    server.post('/api/bet/special/place', isAuthenticated, async (req, res) => {
        const { specialBetId, wager_amount } = req.body;
        // We'll retrieve the special bet definition from special_bets.
        // Then we insert a row into bets for the user's placement.

        if (!specialBetId || !wager_amount) {
            return res.status(400).json({ message: "Missing parameters." });
        }

        const wager = parseFloat(wager_amount);
        if (isNaN(wager) || wager <= 0) {
            return res.status(400).json({ message: "Invalid wager amount." });
        }

        try {
            // Check user funds
            const user = await db.get("SELECT bettingAmount FROM users WHERE id = ?", req.session.user.id);
            if (!user || user.bettingAmount < wager) {
                return res.status(400).json({ message: "Insufficient betting funds." });
            }

            // Retrieve the special bet definition
            const specialBet = await db.get("SELECT * FROM special_bets WHERE id = ?", specialBetId);
            if (!specialBet) {
                return res.status(404).json({ message: "Special bet not found." });
            }

            // Start transaction
            await db.run("BEGIN TRANSACTION");

            // Insert the user's bet into bets table
            // event_id = 0 or -1 can indicate it's from special bets
            // predicted_winner = the special bet description
            // wager_amount = user's bet amount
            await db.run(
                "INSERT INTO bets (user_id, event_id, predicted_winner, wager_amount) VALUES (?, ?, ?, ?)",
                req.session.user.id,
                0, // or -1, to indicate special bet
                specialBet.description, // store the special bet's description in predicted_winner
                wager
            );

            // Deduct user funds
            await db.run(
                "UPDATE users SET bettingAmount = bettingAmount - ? WHERE id = ?",
                wager,
                req.session.user.id
            );

            // Commit
            await db.run("COMMIT");

            res.json({ message: "Special bet placed successfully." });
        } catch (err) {
            await db.run("ROLLBACK");
            console.error("Error placing special bet:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    });


    // DELETE /api/specialbets/delete endpoint to remove a special bet
    server.delete('/api/specialbets/delete', isAuthenticated, isAdmin, async (req, res) => {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ message: "Special bet ID is required." });
        }
        try {
            await db.run("DELETE FROM special_bets WHERE id = ?", id);
            res.json({ message: "Special bet deleted successfully." });
        } catch (err) {
            console.error("Error deleting special bet:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    });





  // Next.js page routes:
  server.get('/login', (req, res) => {
    return app.render(req, res, '/login', req.query);
  });
  server.get('/signup', (req, res) => {
    return app.render(req, res, '/signup', req.query);
  });
  server.get('/dashboard', isAuthenticated, (req, res) => {
    return app.render(req, res, '/dashboard', req.query);
  });
  server.get('/events', isAuthenticated, (req, res) => {
    return app.render(req, res, '/events', req.query);
  });
  server.get('/leaderboard', isAuthenticated, (req, res) => {
    return app.render(req, res, '/leaderboard', req.query);
  });
  server.get('/betting', isAuthenticated, (req, res) => {
    return app.render(req, res, '/betting', req.query);
  });
  server.get('/explore', isAuthenticated, (req, res) => {
    return app.render(req, res, '/explore', req.query);
  });
  server.get('/profile', isAuthenticated, (req, res) => {
    return app.render(req, res, '/profile', req.query);
  });
  server.get('/schedule', isAuthenticated, (req, res) => {
    return app.render(req, res, '/schedule', req.query);
  });

  // Catch-all route for Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Server is running on http://localhost:${PORT}`);
  });
});
