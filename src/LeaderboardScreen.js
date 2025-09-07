import React, { useEffect, useState, useRef } from 'react';
import './LeaderboardScreen.css';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const ROW_HEIGHT = 60; // px

export default function LeaderboardScreen({ user }) {
  const [users, setUsers] = useState([]);
  const [prevRanks, setPrevRanks] = useState({}); // track previous ranks for bounce
  const navigate = useNavigate();
  const containerRef = useRef();

  useEffect(() => {
    if (!user) return;

    const fetchLeaderboard = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login', { replace: true });
          return;
        }

        const res = await fetch(`${BACKEND_URL}/auth/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error('Failed to fetch leaderboard');
          return;
        }

        const data = await res.json();
        const sortedData = Array.isArray(data)
          ? data.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
          : [];

        // Detect upward movement
        const newRanks = {};
        sortedData.forEach((u, idx) => {
          const prevRank = prevRanks[u._id] ?? idx;
          newRanks[u._id] = idx;

          // Add bounce class if user moved up
          if (prevRank > idx) {
            const el = document.getElementById(`user-${u._id}`);
            if (el) {
              el.classList.add('bounce-up');
              setTimeout(() => el.classList.remove('bounce-up'), 600);
            }
          }
        });

        setPrevRanks(newRanks);
        setUsers(sortedData);

      } catch (err) {
        console.error(err);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 3000); // live refresh every 3s
    return () => clearInterval(interval);
  }, [user, navigate, prevRanks]);

  const getRankDisplay = (rank) => {
    switch (rank) {
      case 1: return '👑🔥';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank;
    }
  };

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h2>Leaderboard</h2>
        <button onClick={() => navigate('/dashboard')}>Back</button>
      </div>

      <div className="leaderboard-container" ref={containerRef} style={{ height: users.length * ROW_HEIGHT }}>
        {users.map((u, idx) => {
          const isCurrentUser = String(u._id) === String(user._id);
          const targetY = idx * ROW_HEIGHT;

          return (
            <div
              id={`user-${u._id}`}
              key={u._id}
              className={`leaderboard-item ${isCurrentUser ? 'current-user' : ''}`}
              style={{
                transform: `translateY(${targetY}px)`,
                transition: 'transform 0.6s ease',
                height: `${ROW_HEIGHT}px`,
                position: 'absolute',
                width: '100%',
              }}
            >
              <span className="leaderboard-rank">{getRankDisplay(idx + 1)}</span>
              <img
                src={
                  u.photo || `https://avatars.dicebear.com/api/bottts/${encodeURIComponent(u.email)}.svg`
                }
                alt="Avatar"
                className="leaderboard-avatar"
              />
              <span className="leaderboard-name">{u.displayName || 'Anonymous'}</span>
              <span className="leaderboard-score">{u.totalScore || 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
