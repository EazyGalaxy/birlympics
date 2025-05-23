"use client";

import { useState, useEffect } from "react";
import styles from "./betting.module.css";

interface BettingEvent {
    id: number;
    title: string;
    date: string;
    time: string;
    moneyLine1: number | null;
    moneyLine2: number | null;
    moneyLine3?: number | null;
    moneyLine4?: number | null;
    participants: string[];
}

interface SpecialBet {
    id: number;
    description: string;
    odds: number;
}

export default function BettingPage() {
    // Regular events state
    const [events, setEvents] = useState<BettingEvent[]>([]);
    const [selectedEventBet, setSelectedEventBet] = useState<{
        eventId: number;
        participantIndex: number;
        moneyline: number;
    } | null>(null);
    const [wagerAmount, setWagerAmount] = useState("");

    // Special bets state
    const [specialBets, setSpecialBets] = useState<SpecialBet[]>([]);
    const [selectedSpecialBet, setSelectedSpecialBet] = useState<SpecialBet | null>(null);
    const [specialWagerAmount, setSpecialWagerAmount] = useState("");

    // User funds and message state
    const [userBettingMoney, setUserBettingMoney] = useState(0);
    const [message, setMessage] = useState("");

    // Fetch user profile and regular events on mount
    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch profile for funds
                const profileRes = await fetch("/api/profile", { credentials: "include" });
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setUserBettingMoney(profileData.bettingAmount ?? 50);
                } else {
                    setMessage("Failed to load user profile.");
                }
                // Fetch regular events
                const eventsRes = await fetch("/api/betting", { credentials: "include" });
                if (eventsRes.ok) {
                    const data = await eventsRes.json();
                    const sorted = data.events.sort((a: BettingEvent, b: BettingEvent) => {
                        if (a.date === b.date) {
                            return a.time.localeCompare(b.time);
                        }
                        return a.date.localeCompare(b.date);
                    });
                    setEvents(sorted);
                } else {
                    setMessage("Failed to load events.");
                }
            } catch (err) {
                console.error("Error fetching data:", err);
                setMessage("Error loading data.");
            }
        }
        fetchData();
    }, []);

    // Fetch special bets (admin-created) on mount
    useEffect(() => {
        async function fetchSpecialBets() {
            try {
                const res = await fetch("/api/specialbets", { credentials: "include" });
                if (res.ok) {
                    const data = await res.json();
                    setSpecialBets(data.specialBets || []);
                } else {
                    console.error("Failed to fetch special bets.");
                }
            } catch (err) {
                console.error("Error fetching special bets:", err);
            }
        }
        fetchSpecialBets();
    }, []);

    // Handler for selecting a moneyline for regular events
    const handleMoneylineClick = (
        ev: BettingEvent,
        participantIndex: number,
        moneylineValue: number | null
    ) => {
        if (moneylineValue === null) {
            alert("Moneyline not available.");
            return;
        }
        if (selectedEventBet && selectedEventBet.eventId !== ev.id) {
            alert("Only one event can be selected at a time.");
            return;
        }
        setSelectedEventBet({ eventId: ev.id, participantIndex, moneyline: moneylineValue });
    };

    // Place bet on a regular event
    const handleBetSubmit = async (ev: BettingEvent) => {
        const wager = parseFloat(wagerAmount);
        if (isNaN(wager) || wager <= 0) {
            alert("Enter a valid wager.");
            return;
        }
        if (wager > userBettingMoney) {
            alert("Insufficient funds.");
            return;
        }
        if (!selectedEventBet) {
            alert("No bet selected.");
            return;
        }
        const predicted_winner = ev.participants[selectedEventBet.participantIndex];
        try {
            const res = await fetch("/api/bet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    eventId: ev.id,
                    predicted_winner,
                    wager_amount: wager,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                alert("Bet placed successfully.");
                setUserBettingMoney(userBettingMoney - wager);
                setSelectedEventBet(null);
                setWagerAmount("");
            } else {
                alert("Error placing bet: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Error placing bet:", err);
            alert("Error placing bet.");
        }
    };

    // Handler for selecting a special bet from the table
    const handleSpecialBetSelect = (bet: SpecialBet) => {
        setSelectedSpecialBet(bet);
    };

    // Place bet on a special bet
    const handleSpecialBetPlace = async () => {
        const wager = parseFloat(specialWagerAmount);
        if (isNaN(wager) || wager <= 0) {
            alert("Enter a valid wager amount.");
            return;
        }
        if (wager > userBettingMoney) {
            alert("Insufficient funds.");
            return;
        }
        if (!selectedSpecialBet) {
            alert("No special bet selected.");
            return;
        }
        try {
            const res = await fetch("/api/bet/special/place", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    specialBetId: selectedSpecialBet.id,
                    wager_amount: wager,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                alert("Special bet placed successfully.");
                setUserBettingMoney(userBettingMoney - wager);
                setSelectedSpecialBet(null);
                setSpecialWagerAmount("");
            } else {
                alert("Error placing special bet: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Error placing special bet:", err);
            alert("Error placing special bet.");
        }
    };

    return (
        <div className={styles.bettingContainer}>
            <h1 className={styles.heading}>Betting Events</h1>
            {message && <p className={styles.message}>{message}</p>}
            <p>Available funds: ${userBettingMoney}</p>

            {/* Regular Events Section */}
            {events.length === 0 ? (
                <p>No events available.</p>
            ) : (
                events.map((ev) => {
                    const moneylines = [
                        ev.moneyLine1,
                        ev.moneyLine2,
                        ev.moneyLine3 !== undefined ? ev.moneyLine3 : null,
                        ev.moneyLine4 !== undefined ? ev.moneyLine4 : null,
                    ];
                    return (
                        <div key={ev.id} className={styles.eventCard}>
                            <div className={styles.eventHeader}>
                                <h2 className={styles.eventTitle}>{ev.title}</h2>
                                <p className={styles.eventMeta}>
                                    {ev.date} at {ev.time}
                                </p>
                            </div>
                            <table className={styles.bettingTable}>
                                <thead>
                                    <tr>
                                        <th>Participant</th>
                                        <th>Moneyline</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ev.participants.map((name, idx) => (
                                        <tr key={idx}>
                                            <td>{name}</td>
                                            <td
                                                onClick={() => handleMoneylineClick(ev, idx, moneylines[idx])}
                                                className={
                                                    selectedEventBet &&
                                                        selectedEventBet.eventId === ev.id &&
                                                        selectedEventBet.participantIndex === idx
                                                        ? styles.selected
                                                        : ""
                                                }
                                                style={{ cursor: "pointer" }}
                                            >
                                                {moneylines[idx] !== null
                                                    ? moneylines[idx] > 0
                                                        ? "+" + moneylines[idx]
                                                        : moneylines[idx]
                                                    : "n/a"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {selectedEventBet && selectedEventBet.eventId === ev.id && (
                                <div className={styles.betForm}>
                                    <input
                                        type="number"
                                        value={wagerAmount}
                                        onChange={(e) => setWagerAmount(e.target.value)}
                                        placeholder="Enter wager amount"
                                    />
                                    <button onClick={() => handleBetSubmit(ev)}>Place Bet</button>
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {/* Special Bets Section */}
            <section style={{ marginTop: "2rem" }}>
                <h2>Special Bets</h2>
                {specialBets.length === 0 ? (
                    <p>No special bets available.</p>
                ) : (
                    <table className={styles.bettingTable}>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Odds</th>
                            </tr>
                        </thead>
                        <tbody>
                            {specialBets.map((sb) => (
                                <tr
                                    key={sb.id}
                                    onClick={() => handleSpecialBetSelect(sb)}
                                    className={selectedSpecialBet?.id === sb.id ? styles.selected : ""}
                                    style={{ cursor: "pointer" }}
                                >
                                    <td>{sb.description}</td>
                                    <td>{sb.odds > 0 ? "+" + sb.odds : sb.odds}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {selectedSpecialBet && (
                    <div className={styles.betForm}>
                        <p>
                            Selected Special Bet: <strong>{selectedSpecialBet.description}</strong>
                        </p>
                        <input
                            type="number"
                            value={specialWagerAmount}
                            onChange={(e) => setSpecialWagerAmount(e.target.value)}
                            placeholder="Enter wager amount"
                        />
                        <button onClick={handleSpecialBetPlace}>Place Special Bet</button>
                    </div>
                )}
            </section>
        </div>
    );
}
