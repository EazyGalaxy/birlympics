"use client";
import { useState, useEffect } from "react";
import styles from "./leaderboards.module.css";

interface LeaderboardEntry {
    id: number;
    username: string;
    displayName: string;
    flag: string;
    totalPoints: number;
    goldMedals: number;
}

export default function LeaderboardsPage() {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch("/api/leaderboards", { credentials: "include" });
                if (res.ok) {
                    const result = await res.json();
                    setData(result.leaderboard);
                    console.log("Leaderboard data:", result.leaderboard);
                } else {
                    setError("Failed to load leaderboard data.");
                }
            } catch (err) {
                console.error("Error fetching leaderboard:", err);
                setError("Error fetching leaderboard data.");
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    if (loading) return <p>Loading leaderboard...</p>;
    if (error) return <p>{error}</p>;

    // Sort by totalPoints
    let sortedByPoints =
        data.length > 0 && data.every((entry) => entry.totalPoints === 0)
            ? [...data].sort((a, b) => a.id - b.id)
            : [...data].sort((a, b) => b.totalPoints - a.totalPoints);

    // Sort by goldMedals
    let sortedByGold =
        data.length > 0 && data.every((entry) => entry.goldMedals === 0)
            ? [...data].sort((a, b) => a.id - b.id)
            : [...data].sort((a, b) => b.goldMedals - a.goldMedals);

    /**
     * Renders a 3-column podium for the top three users.
     * The numeric value is shown below the rank number.
     */
    const renderPodium = (
        sortedData: LeaderboardEntry[],
        metric: "totalPoints" | "goldMedals"
    ) => {
        const first = sortedData[0] || { displayName: "", username: "", flag: "", totalPoints: 0, goldMedals: 0 };
        const second = sortedData[1] || { displayName: "", username: "", flag: "", totalPoints: 0, goldMedals: 0 };
        const third = sortedData[2] || { displayName: "", username: "", flag: "", totalPoints: 0, goldMedals: 0 };

        // Helper to get the right numeric value
        const getValue = (entry: LeaderboardEntry) => {
            return metric === "totalPoints" ? entry.totalPoints : entry.goldMedals;
        };

        return (
            <div className={styles.podium}>
                {/* Second Place Column */}
                <div className={`${styles.podiumColumn} ${styles.secondPlace}`}>
                    <div className={styles.positionNumber}>2</div>
                    <div className={styles.podiumMetric}>
                        {getValue(second)}
                    </div>
                    <div className={styles.podiumName}>
                        {second.displayName || second.username}
                        {second.flag && (
                            <img src={second.flag} alt="Flag" className={styles.inlineFlag} />
                        )}
                    </div>
                </div>

                {/* First Place Column */}
                <div className={`${styles.podiumColumn} ${styles.firstPlace}`}>
                    <div className={styles.positionNumber}>1</div>
                    <div className={styles.podiumMetric}>
                        {getValue(first)}
                    </div>
                    <div className={styles.podiumName}>
                        {first.displayName || first.username}
                        {first.flag && (
                            <img src={first.flag} alt="Flag" className={styles.inlineFlag} />
                        )}
                    </div>
                </div>

                {/* Third Place Column */}
                <div className={`${styles.podiumColumn} ${styles.thirdPlace}`}>
                    <div className={styles.positionNumber}>3</div>
                    <div className={styles.podiumMetric}>
                        {getValue(third)}
                    </div>
                    <div className={styles.podiumName}>
                        {third.displayName || third.username}
                        {third.flag && (
                            <img src={third.flag} alt="Flag" className={styles.inlineFlag} />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    /**
     * Renders a table for rank 4 and beyond.
     */
    const renderRemainingTable = (
        sortedData: LeaderboardEntry[],
        metric: "totalPoints" | "goldMedals",
        metricLabel: string
    ) => {
        const remaining = sortedData.slice(3);
        return (
            <table className={styles.leaderboardTable}>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Display Name</th>
                        <th>{metricLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    {remaining.map((entry, index) => (
                        <tr key={`${entry.id}-${index}`}>
                            <td>{index + 4}</td>
                            <td>{entry.displayName || entry.username}</td>
                            <td>
                                {metric === "totalPoints" ? entry.totalPoints : entry.goldMedals}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <div className={styles.pageContainer}>
            <h1>Leaderboards</h1>

            {/* TOTAL POINTS SECTION */}
            <div className={styles.sectionContainer}>
                <h2>Total Points</h2>
                <div className={styles.box}>
                    {renderPodium(sortedByPoints, "totalPoints")}
                    {renderRemainingTable(sortedByPoints, "totalPoints", "Points")}
                </div>
            </div>

            {/* TOTAL GOLD MEDALS SECTION */}
            <div className={styles.sectionContainer}>
                <h2>Total Gold Medals</h2>
                <div className={styles.box}>
                    {renderPodium(sortedByGold, "goldMedals")}
                    {renderRemainingTable(sortedByGold, "goldMedals", "Gold Medals")}
                </div>
            </div>
        </div>
    );
}
