'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import styles from './login.module.css';

export default function SignUp() {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');

    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     try {
           const res = await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include', // Ensure cookies are sent and received
              body: JSON.stringify({ username, password }),
         });
         const data = await res.json();
         if (res.ok) {
                router.push('/dashboard');
          } else {
             setError(data.message || 'Login failed');
          }
      } catch (err) {
           setError('An unexpected error occurred.');
           console.error('Login error:', err);
     }
    };

    return (
        <div className={styles.container}>
            <h1>Login</h1>
            {error && <p className={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                    <label htmlFor="username">Username:</label><br />
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                   </div>
                   <div className={styles.inputGroup}>
                    <label htmlFor="password">Password:</label><br />
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                   </div>
                   <button type="Submit" style={{ padding: '0.5rem 1rem'}}>Login</button>
                </form>
            </div>
        );
    }
