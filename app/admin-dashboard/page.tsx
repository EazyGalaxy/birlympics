"use client";

import { useState, useEffect } from "react";
import styles from "./admin-dashboard.module.css";

interface User {
    id: string;
    username: string;
    displayName: string;
    totalPoints: number;
    goldMedals: number;
}

interface AdminEvent {
    id: number;
    title: string;
    date: string;
    time: string;
    moneyLine1: number | null;
    moneyLine2: number | null;
    moneyLine3: number | null;
    moneyLine4: number | null;
    participants: string; // Comma-separated list of user IDs
}

interface AdminBet {
    id: number;
    user_id: number;
    predicted_winner: string;
    wager_amount: number;
    moneyline?: number;
    username?: string;
    eventTitle?: string;
}

interface SpecialBet {
    id: number;
    description: string;
    odds: number;
}

export default function AdminDashboard() {
    // Section 1: Update User Totals
    const [users, setUsers] = useState<User[]>([]);
    const [adjustments, setAdjustments] = useState<{
        [key: string]: { totalPoints: string; goldMedals: string };
    }>({});
    const [totalsMessage, setTotalsMessage] = useState("");

    // Section 2: Add Event
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [eventTime, setEventTime] = useState("");
    const [eventParticipants, setEventParticipants] = useState<string[]>([]);
    const [eventMessage, setEventMessage] = useState("");

    // Section 3: Update Moneylines / Delete Events
    const [adminEvents, setAdminEvents] = useState<AdminEvent[]>([]);
    const [moneylineMessage, setMoneylineMessage] = useState("");
    const [moneylineEdits, setMoneylineEdits] = useState<{
        [eventId: number]: {
            moneyLine1: string;
            moneyLine2: string;
            moneyLine3: string;
            moneyLine4: string;
        };
    }>({});

    // Section 4: Manage Bets / Delete Bets
    const [adminBets, setAdminBets] = useState<AdminBet[]>([]);
    const [betsMessage, setBetsMessage] = useState("");
    const [betAdjustments, setBetAdjustments] = useState<{ [betId: number]: string }>({});

    // Section 5: Create Special Bet
    const [specialDescription, setSpecialDescription] = useState("");
    const [specialOdds, setSpecialOdds] = useState("");
    const [specialMessage, setSpecialMessage] = useState("");

    // NEW Section 6: Remove Special Bets
    const [specialBetsList, setSpecialBetsList] = useState<SpecialBet[]>([]);

    // --- Fetch Functions ---
    const fetchUsers = () => {
        fetch("/api/users", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                if (data.users) {
                    setUsers(data.users);
                    const initAdjustments: { [key: string]: { totalPoints: string; goldMedals: string } } = {};
                    data.users.forEach((user: User) => {
                        initAdjustments[user.id] = { totalPoints: "", goldMedals: "" };
                    });
                    setAdjustments(initAdjustments);
                }
            })
            .catch((err) => console.error("Error fetching users:", err));
    };

    const fetchAdminEvents = () => {
        fetch("/api/events", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                if (data.events) {
                    setAdminEvents(data.events);
                    const initEdits: {
                        [eventId: number]: {
                            moneyLine1: string;
                            moneyLine2: string;
                            moneyLine3: string;
                            moneyLine4: string;
                        };
                    } = {};
                    data.events.forEach((ev: AdminEvent) => {
                        initEdits[ev.id] = {
                            moneyLine1: ev.moneyLine1 != null ? String(ev.moneyLine1) : "",
                            moneyLine2: ev.moneyLine2 != null ? String(ev.moneyLine2) : "",
                            moneyLine3: ev.moneyLine3 != null ? String(ev.moneyLine3) : "",
                            moneyLine4: ev.moneyLine4 != null ? String(ev.moneyLine4) : "",
                        };
                    });
                    setMoneylineEdits(initEdits);
                }
            })
            .catch((err) => console.error("Error fetching events:", err));
    };

    const fetchAdminBets = () => {
        fetch("/api/bets/all", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                if (data.bets) {
                    setAdminBets(data.bets);
                    const initBetAdj: { [betId: number]: string } = {};
                    data.bets.forEach((b: AdminBet) => {
                        initBetAdj[b.id] = "";
                    });
                    setBetAdjustments(initBetAdj);
                }
            })
            .catch((err) => console.error("Error fetching bets:", err));
    };

    // NEW: Fetch Special Bets from the special_bets table
    const fetchSpecialBets = () => {
        fetch("/api/specialbets", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                if (data.specialBets) {
                    setSpecialBetsList(data.specialBets);
                }
            })
            .catch((err) => console.error("Error fetching special bets:", err));
    };

    useEffect(() => {
        fetchUsers();
        fetchAdminEvents();
        fetchAdminBets();
        fetchSpecialBets();
    }, []);

    // --- Handlers for Update Totals ---
    const handleAdjustmentChange = (
        userId: string,
        field: "totalPoints" | "goldMedals",
        value: string
    ) => {
        setAdjustments({
            ...adjustments,
            [userId]: { ...adjustments[userId], [field]: value },
        });
    };

    const handleTotalsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const updateArray = Object.entries(adjustments)
            .filter(
                ([, values]) => values.totalPoints.trim() !== "" || values.goldMedals.trim() !== ""
            )
            .map(([userId, values]) => ({
                userId,
                points: values.totalPoints.trim() === "" ? 0 : Number(values.totalPoints),
                goldMedals: values.goldMedals.trim() === "" ? 0 : Number(values.goldMedals),
            }));
        if (updateArray.length === 0) {
            setTotalsMessage("No changes to update.");
            return;
        }
        const res = await fetch("/api/totals/edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updates: updateArray }),
            credentials: "include",
        });
        const data = await res.json();
        setTotalsMessage(data.message || "Totals updated successfully.");
        fetchUsers();
    };

    // --- Handlers for Add Event ---
    const handleParticipantToggle = (userId: string) => {
        if (eventParticipants.includes(userId)) {
            setEventParticipants(eventParticipants.filter((id) => id !== userId));
        } else {
            setEventParticipants([...eventParticipants, userId]);
        }
    };

    const handleAddEventSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: eventName,
            date: eventDate,
            time: eventTime,
            participants: eventParticipants.join(","),
        };
        const res = await fetch("/api/events/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include",
        });
        const data = await res.json();
        setEventMessage(data.message || "Event added successfully.");
        fetchAdminEvents();
    };

    // --- Handlers for Moneyline Updates ---
    const handleMoneylineChange = (
        eventId: number,
        field: "moneyLine1" | "moneyLine2" | "moneyLine3" | "moneyLine4",
        value: string
    ) => {
        setMoneylineEdits({
            ...moneylineEdits,
            [eventId]: { ...moneylineEdits[eventId], [field]: value },
        });
    };

    const handleMoneylineUpdate = async (ev: AdminEvent) => {
        const ml1 = parseFloat(moneylineEdits[ev.id].moneyLine1);
        const ml2 = parseFloat(moneylineEdits[ev.id].moneyLine2);
        const ml3 = parseFloat(moneylineEdits[ev.id].moneyLine3);
        const ml4 = parseFloat(moneylineEdits[ev.id].moneyLine4);

        const payload = {
            eventId: ev.id,
            title: ev.title,
            date: ev.date,
            time: ev.time,
            participants: ev.participants,
            moneyLine1: isNaN(ml1) ? null : ml1,
            moneyLine2: isNaN(ml2) ? null : ml2,
            moneyLine3: isNaN(ml3) ? null : ml3,
            moneyLine4: isNaN(ml4) ? null : ml4,
        };

        try {
            const res = await fetch("/api/events/edit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) {
                setMoneylineMessage("Moneylines updated successfully.");
                fetchAdminEvents();
            } else {
                setMoneylineMessage(data.message || "Error updating moneylines.");
            }
        } catch (err) {
            console.error("Error updating moneylines:", err);
            setMoneylineMessage("Error updating moneylines.");
        }
    };

    // --- Handlers for Delete Operations ---
    const handleDeleteEvent = async (eventId: number) => {
        if (!confirm("Are you sure you want to delete this event?")) return;
        try {
            const res = await fetch("/api/events/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ eventId }),
            });
            const data = await res.json();
            if (res.ok) {
                setEventMessage("Event deleted successfully.");
                fetchAdminEvents();
            } else {
                setEventMessage(data.message || "Error deleting event.");
            }
        } catch (err) {
            console.error("Error deleting event:", err);
            setEventMessage("Error deleting event.");
        }
    };

    const handleDeleteBet = async (betId: number) => {
        if (!confirm("Are you sure you want to delete this bet?")) return;
        try {
            const res = await fetch("/api/bets/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ betId }),
            });
            const data = await res.json();
            if (res.ok) {
                setBetsMessage("Bet deleted successfully.");
                fetchAdminBets();
            } else {
                setBetsMessage(data.message || "Error deleting bet.");
            }
        } catch (err) {
            console.error("Error deleting bet:", err);
            setBetsMessage("Error deleting bet.");
        }
    };

    // --- Handlers for Bet Adjustments ---
    const handleBetAdjustmentChange = (betId: number, value: string) => {
        setBetAdjustments({
            ...betAdjustments,
            [betId]: value,
        });
    };

    const handleBetApply = async (bet: AdminBet) => {
        const delta = parseFloat(betAdjustments[bet.id]);
        if (isNaN(delta) || delta === 0) {
            alert("Enter a non-zero numeric value for the adjustment.");
            return;
        }
        const payload = {
            betId: bet.id,
            userId: bet.user_id,
            delta,
        };
        try {
            const res = await fetch("/api/bets/adminAdjust", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) {
                alert("Adjustment applied successfully.");
                fetchAdminBets();
            } else {
                alert("Error applying adjustment: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Error applying bet adjustment:", err);
            alert("Error applying bet adjustment.");
        }
    };

    // --- Handler for Creating Special Bet ---
    const handleSpecialBetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!specialDescription.trim() || !specialOdds.trim()) {
            alert("Please fill in all fields.");
            return;
        }
        try {
            const res = await fetch("/api/specialbets/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    description: specialDescription,
                    odds: specialOdds,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSpecialMessage("Special bet created successfully.");
                setSpecialDescription("");
                setSpecialOdds("");
                // Refresh special bets list after creation
                fetchSpecialBets();
            } else {
                setSpecialMessage(data.message || "Error creating special bet.");
            }
        } catch (err) {
            console.error("Error creating special bet:", err);
            setSpecialMessage("Error creating special bet.");
        }
    };

    // --- Handler for Removing Special Bet ---
    const handleDeleteSpecialBet = async (id: number) => {
        if (!confirm("Are you sure you want to delete this special bet?")) return;
        try {
            const res = await fetch("/api/specialbets/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (res.ok) {
                alert("Special bet deleted successfully.");
                fetchSpecialBets();
            } else {
                alert("Error deleting special bet: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Error deleting special bet:", err);
            alert("Error deleting special bet.");
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>Admin Dashboard</h1>

            {/* 1) Update User Totals Section */}
            <section className={styles.section}>
                <h2>Update User Totals</h2>
                {totalsMessage && <p className={styles.message}>{totalsMessage}</p>}
                <form onSubmit={handleTotalsSubmit} className={styles.form}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Current Points</th>
                                <th>Adjustment Points</th>
                                <th>Current Gold Medals</th>
                                <th>Adjustment Gold Medals</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.displayName || user.username}</td>
                                    <td>{user.totalPoints}</td>
                                    <td>
                                        <input
                                            type="text"
                                            value={adjustments[user.id]?.totalPoints || ""}
                                            onChange={(e) =>
                                                handleAdjustmentChange(user.id, "totalPoints", e.target.value)
                                            }
                                            placeholder="e.g. +1 or -2"
                                        />
                                    </td>
                                    <td>{user.goldMedals}</td>
                                    <td>
                                        <input
                                            type="text"
                                            value={adjustments[user.id]?.goldMedals || ""}
                                            onChange={(e) =>
                                                handleAdjustmentChange(user.id, "goldMedals", e.target.value)
                                            }
                                            placeholder="e.g. +1 or -1"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="submit" className={styles.button}>
                        Update Totals
                    </button>
                </form>
            </section>

            {/* 2) Add Event Section */}
            <section className={styles.section}>
                <h2>Add Event</h2>
                {eventMessage && <p className={styles.message}>{eventMessage}</p>}
                <form onSubmit={handleAddEventSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="eventName">Event Name:</label>
                        <input
                            id="eventName"
                            type="text"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="eventDate">Date:</label>
                        <input
                            id="eventDate"
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="eventTime">Time:</label>
                        <input
                            id="eventTime"
                            type="time"
                            value={eventTime}
                            onChange={(e) => setEventTime(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Participants:</label>
                        <div className={styles.checkboxGroup}>
                            {users.map((user) => (
                                <div key={user.id} className={styles.checkboxItem}>
                                    <input
                                        type="checkbox"
                                        checked={eventParticipants.includes(user.id)}
                                        onChange={() => handleParticipantToggle(user.id)}
                                    />
                                    <span>{user.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className={styles.button}>
                        Add Event
                    </button>
                </form>
            </section>

            {/* 3) Update Moneylines Section with Delete for Events */}
            <section className={styles.section}>
                <h2>Update Moneylines / Delete Events</h2>
                {moneylineMessage && <p className={styles.message}>{moneylineMessage}</p>}
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Participant 1</th>
                            <th>MoneyLine1</th>
                            <th>Participant 2</th>
                            <th>MoneyLine2</th>
                            <th>Participant 3</th>
                            <th>MoneyLine3</th>
                            <th>Participant 4</th>
                            <th>MoneyLine4</th>
                            <th>Update</th>
                            <th>Delete</th>
                        </tr>
                    </thead>
                    <tbody>
                        {adminEvents.map((ev) => {
                            const participantIds = ev.participants
                                ? ev.participants.split(",").map((p) => p.trim())
                                : [];
                            const participantNames = participantIds.map((pid) => {
                                const user = users.find((u) => String(u.id) === pid);
                                return user ? (user.displayName || user.username) : "Unknown";
                            });
                            return (
                                <tr key={ev.id}>
                                    <td>{ev.title}</td>
                                    <td>{ev.date}</td>
                                    <td>{ev.time}</td>
                                    <td>{participantNames[0] || ""}</td>
                                    <td>
                                        <input
                                            type="text"
                                            value={moneylineEdits[ev.id]?.moneyLine1 || ""}
                                            onChange={(e) => handleMoneylineChange(ev.id, "moneyLine1", e.target.value)}
                                            className={styles.moneylineInput}
                                        />
                                    </td>
                                    <td>{participantNames[1] || ""}</td>
                                    <td>
                                        <input
                                            type="text"
                                            value={moneylineEdits[ev.id]?.moneyLine2 || ""}
                                            onChange={(e) => handleMoneylineChange(ev.id, "moneyLine2", e.target.value)}
                                            className={styles.moneylineInput}
                                        />
                                    </td>
                                    <td>{participantNames[2] || ""}</td>
                                    <td>
                                        <input
                                            type="text"
                                            value={moneylineEdits[ev.id]?.moneyLine3 || ""}
                                            onChange={(e) => handleMoneylineChange(ev.id, "moneyLine3", e.target.value)}
                                            className={styles.moneylineInput}
                                        />
                                    </td>
                                    <td>{participantNames[3] || ""}</td>
                                    <td>
                                        <input
                                            type="text"
                                            value={moneylineEdits[ev.id]?.moneyLine4 || ""}
                                            onChange={(e) => handleMoneylineChange(ev.id, "moneyLine4", e.target.value)}
                                            className={styles.moneylineInput}
                                        />
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className={styles.button}
                                            onClick={() => handleMoneylineUpdate(ev)}
                                        >
                                            Update
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className={styles.button}
                                            onClick={() => handleDeleteEvent(ev.id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            {/* 4) Manage Bets Section with Delete for Bets */}
            <section className={styles.section}>
                <h2>Manage Bets</h2>
                {betsMessage && <p className={styles.message}>{betsMessage}</p>}
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Bet ID</th>
                            <th>User</th>
                            <th>Event</th>
                            <th>Predicted Winner</th>
                            <th>Wager</th>
                            <th>Moneyline</th>
                            <th>Adjustment</th>
                            <th>Apply</th>
                            <th>Delete</th>
                        </tr>
                    </thead>
                    <tbody>
                        {adminBets.map((bet) => (
                            <tr key={bet.id}>
                                <td>{bet.id}</td>
                                <td>{bet.username ? bet.username : "Unknown"}</td>
                                <td>{bet.eventTitle || "N/A"}</td>
                                <td>{bet.predicted_winner}</td>
                                <td>{bet.wager_amount}</td>
                                <td>{bet.moneyline != null ? bet.moneyline : "n/a"}</td>
                                <td>
                                    <input
                                        type="text"
                                        value={betAdjustments[bet.id] || ""}
                                        onChange={(e) => handleBetAdjustmentChange(bet.id, e.target.value)}
                                        placeholder="e.g. +10 or -5"
                                        className={styles.betAdjustmentInput}
                                    />
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className={styles.button}
                                        onClick={() => handleBetApply(bet)}
                                    >
                                        Apply
                                    </button>
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className={styles.button}
                                        onClick={() => handleDeleteBet(bet.id)}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* 5) Create Special Bet Section */}
            <section className={styles.section}>
                <h2>Create Special Bet</h2>
                {specialMessage && <p className={styles.message}>{specialMessage}</p>}
                <form onSubmit={handleSpecialBetSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="specialDescription">Bet Description:</label>
                        <input
                            id="specialDescription"
                            type="text"
                            value={specialDescription}
                            onChange={(e) => setSpecialDescription(e.target.value)}
                            placeholder="Enter bet description"
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="specialOdds">Odds:</label>
                        <input
                            id="specialOdds"
                            type="number"
                            value={specialOdds}
                            onChange={(e) => setSpecialOdds(e.target.value)}
                            placeholder="Enter odds"
                            required
                        />
                    </div>
                    <button type="submit" className={styles.button}>
                        Create Special Bet
                    </button>
                </form>
            </section>

            {/* 6) Remove Special Bets Section */}
            <section className={styles.section}>
                <h2>Current Special Bets</h2>
                {specialBetsList.length === 0 ? (
                    <p>No special bets available.</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Description</th>
                                <th>Odds</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {specialBetsList.map((sb) => (
                                <tr key={sb.id}>
                                    <td>{sb.id}</td>
                                    <td>{sb.description}</td>
                                    <td>{sb.odds}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className={styles.button}
                                            onClick={() => handleDeleteSpecialBet(sb.id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}
