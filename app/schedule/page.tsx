"use client";

import { useState, useEffect } from "react";
import styles from "./schedule.module.css";

interface Event {
  id: number;
  name: string;  // or "title" if your DB column is "title"
  time: string;  // Format: "HH:MM" (24-hour format)
  date: string;  // Format: "YYYY-MM-DD"
  participants: string[];
}

export default function SchedulePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayEvents, setDayEvents] = useState<Event[]>([]);

  // Fetch events from your API endpoint
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/schedule", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events);
        } else {
          console.error("Failed to load schedule events.");
        }
      } catch (error) {
        console.error("Error fetching schedule events:", error);
      }
    }
    fetchEvents();
  }, []);

  // Define the months (April to September) for the year 2025
  const year = 2025;
  const months = [3, 4, 5, 6, 7, 8]; // JavaScript months: April=3, September=8

  // Returns the number of days in a given month/year
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // When a day is clicked, show the modal if there are events (sorted from earliest to latest time)
  const handleDayClick = (dateStr: string) => {
    const filtered = events.filter((ev) => ev.date === dateStr);
    if (filtered.length > 0) {
      // Sort by time in ascending order (assuming "HH:MM" 24-hour format)
      const sorted = [...filtered].sort((a, b) => a.time.localeCompare(b.time));
      setSelectedDate(dateStr);
      setDayEvents(sorted);
      setModalOpen(true);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedDate(null);
    setDayEvents([]);
  };

  return (
    <div className={styles.scheduleContainer}>
      <h1 className={styles.scheduleTitle}>Event Schedule</h1>

      <div className={styles.calendar}>
        {months.map((month) => {
          const monthDate = new Date(year, month, 1);
          const monthName = monthDate.toLocaleString("default", { month: "long" });
          const daysInMonth = getDaysInMonth(month, year);

          return (
            <div key={month} className={styles.monthBlock}>
              <h2>
                {monthName} {year}
              </h2>
              <div className={styles.daysGrid}>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const dayEventsForDate = events.filter((ev) => ev.date === dateStr);
                  const hasEvent = dayEventsForDate.length > 0;

                  return (
                    <div
                      key={dateStr}
                      className={`${styles.dayCell} ${hasEvent ? styles.eventDay : ""}`}
                      onClick={() => handleDayClick(dateStr)}
                    >
                      <div className={styles.dayNumber}>{dayNum}</div>
                      {hasEvent && (
                        <div className={styles.eventPreview}>
                          {dayEventsForDate.map((ev) => (
                            <div key={ev.id} className={styles.eventInfo}>
                              <span className={styles.eventName}>{ev.name}</span>
                              <span className={styles.eventTime}>{ev.time}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Day Events */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Events on {selectedDate}</h3>
            {dayEvents.map((ev) => (
              <div key={ev.id} className={styles.eventDetails}>
                <p>
                  <strong>{ev.name}</strong> at {ev.time}
                </p>
                {ev.participants.length > 0 && (
                  <p>Participants: {ev.participants.join(", ")}</p>
                )}
              </div>
            ))}
            <button className={styles.closeButton} onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
