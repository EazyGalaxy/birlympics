'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './Taskbar.module.css'; // Ensure the file name matches exactly

export default function Taskbar() {
  const [flag, setFlag] = useState<string>('');

  useEffect(() => {
    // Fetch the current user's profile to get the flag URL
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.flag) {
          setFlag(data.flag);
        }
      })
      .catch((err) => console.error('Error fetching profile in Taskbar:', err));
  }, []);

  return (
    <div className={styles.taskbar}>
      <Link href="/dashboard" className={styles.button}>
        <div className={styles.headerIcon}>
            <img src="/icons/dashboard-icon.png" alt="Dashboard" />
        </div>
        <h2 className={styles.heading}>Dashboard</h2>
      </Link>
      <Link href="/leaderboards" className={styles.button}>
        <div className={styles.headerIcon}>
            <img src="/icons/leaderboard-icon.png" alt="Leaderboards" />
        </div>
        <h2 className={styles.heading}>Leaderboards</h2>
      </Link>
      <Link href="/schedule" className={styles.button}>
        <div className={styles.headerIcon}>
            <img src="/icons/schedule-icon.png" alt="Schedule" />
        </div>
        <h2 className={styles.heading}>Schedule</h2>
      </Link>
      <Link href="/explore" className={styles.button}>
        <div className={styles.headerIcon}>
            <img src="/icons/photo-icon.png" alt="Explore" />
        </div>
        <h2 className={styles.heading}>Explore</h2>
      </Link>
      <Link href="/betting" className={styles.button}>
        <div className={styles.headerIcon}>
            <img src="/icons/betting-icon.png" alt="Betting" />
        </div>
        <h2 className={styles.heading}>Betting</h2>
      </Link>
      <Link href="/profile" className={styles.button}>
        <div className={styles.profileButton}>
          {flag && (
            <img src={flag} alt="User Flag" className={styles.taskbarFlag} />
          )}
          <span>Profile</span>
        </div>
      </Link>
    </div>
  );
}
