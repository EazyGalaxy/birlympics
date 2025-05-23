"use client";

import { useState, useEffect } from "react";
import styles from "./dashboard.module.css";

interface WeatherDay {
  date: string;
  icon: string;
  description: string;
  tempMin: number;
  tempMax: number;
}

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  participants: string[];
}

interface Result {
  id: number;
  event: string;
  athlete: string;
  position: string;
}

export default function Dashboard() {
  const [weatherForecast, setWeatherForecast] = useState<WeatherDay[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(true);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);
  const [loadingResults, setLoadingResults] = useState<boolean>(true);

  useEffect(() => {
    // Weather forecast for next 3 days using OpenWeatherMap forecast API
    const fetchWeatherForecast = async () => {
      try {
        const city = "Ottawa";
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`
        );
        const data = await res.json();
        if (res.ok) {
          // data.list contains forecasts every 3 hours.
          // Group by date and pick the forecast closest to 12:00:00 for each day.
          const forecastByDate: { [date: string]: WeatherDay } = {};
          data.list.forEach((item: any) => {
            const dtTxt = item.dt_txt; // format: "YYYY-MM-DD HH:MM:SS"
            const date = dtTxt.split(" ")[0];
            // Choose the forecast at noon if available, otherwise the first one for that day.
            if (!forecastByDate[date]) {
              forecastByDate[date] = {
                date,
                icon: item.weather[0].icon,
                description: item.weather[0].description,
                tempMin: item.main.temp_min,
                tempMax: item.main.temp_max,
              };
            }
            if (dtTxt.includes("12:00:00")) {
              forecastByDate[date] = {
                date,
                icon: item.weather[0].icon,
                description: item.weather[0].description,
                tempMin: item.main.temp_min,
                tempMax: item.main.temp_max,
              };
            }
          });
          const dates = Object.keys(forecastByDate).sort().slice(0, 3);
          setWeatherForecast(dates.map((d) => forecastByDate[d]));
        } else {
          console.error("Failed to fetch weather forecast");
        }
      } catch (error) {
        console.error("Error fetching weather forecast:", error);
      } finally {
        setLoadingWeather(false);
      }
    };

    // Fetch today's events from your API
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events/today", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          // Assuming API returns { events: [...] }
          setTodayEvents(data.events || []);
        } else {
          setTodayEvents([]);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
        setTodayEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    };

    // Fetch recent results from your database via API (no dummy data)
    const fetchRecentResults = async () => {
      try {
        const res = await fetch("/api/recent-results", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          // Assuming API returns { results: [...] }
          setRecentResults(data.results || []);
        } else {
          setRecentResults([]);
        }
      } catch (error) {
        console.error("Error fetching recent results:", error);
        setRecentResults([]);
      } finally {
        setLoadingResults(false);
      }
    };

    fetchWeatherForecast();
    fetchEvents();
    fetchRecentResults();
  }, []);

  return (
    <div className={styles.dashboardContainer}>
      <h1 className={styles.heading}>Dashboard</h1>

      {/* Weather Section */}
      <section className={styles.weatherSection}>
        <h2>Weather Forecast (Next 3 Days)</h2>
        {loadingWeather ? (
          <p>Loading weather...</p>
        ) : weatherForecast.length > 0 ? (
          <div className={styles.weatherCards}>
            {weatherForecast.map((day) => (
              <div key={day.date} className={styles.weatherCard}>
                <p className={styles.weatherDate}>{day.date}</p>
                <img
                  src={`http://openweathermap.org/img/wn/${day.icon}@2x.png`}
                  alt={day.description}
                  className={styles.weatherIcon}
                />
                <p className={styles.weatherDesc}>{day.description}</p>
                <p className={styles.weatherTemp}>
                  {Math.round(day.tempMin)}&deg;C - {Math.round(day.tempMax)}&deg;C
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p>Weather data not available.</p>
        )}
      </section>

      {/* Today's Events Section */}
      <section className={styles.eventsSection}>
        <h2>Today's Events</h2>
        {loadingEvents ? (
          <p>Loading events...</p>
        ) : todayEvents.length > 0 ? (
          <div className={styles.eventsList}>
            {todayEvents.map((event) => (
              <div key={event.id} className={styles.eventCard}>
                <h3 className={styles.eventTitle}>{event.title}</h3>
                <p className={styles.eventTime}>Time: {event.time}</p>
                <p className={styles.eventDate}>Date: {event.date}</p>
                {event.participants && event.participants.length > 0 && (
                  <p className={styles.eventParticipants}>
                    Participants: {event.participants.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No events scheduled for today.</p>
        )}
      </section>

      {/* Recent Results Section */}
      <section className={styles.resultsSection}>
        <h2>Recent Results</h2>
        {loadingResults ? (
          <p>Loading results...</p>
        ) : recentResults.length > 0 ? (
          <div className={styles.resultsContainer}>
            {recentResults.map((result) => (
              <div key={result.id} className={styles.resultCard}>
                <h3 className={styles.resultEvent}>{result.event}</h3>
                <p className={styles.resultAthlete}>
                  {result.athlete} - {result.position}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p>No recent results.</p>
        )}
      </section>
    </div>
  );
}
