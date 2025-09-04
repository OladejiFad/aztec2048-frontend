import React, { useEffect, useState } from 'react';
import './LeaderboardScreen.css';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LeaderboardScreen({ user }) {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchLeaderboard = async () => {
      try {
        const token = localStorage.getItem('token'); // JWT auth
        if (!token) {
          navigate('/login', { replace: true });
          return;
        }

        const res = await fetch(`${BACKEND_URL}/auth/leaderboard`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error('Failed to fetch leaderboard');
          return;
        }

        const data = await res.json();
        setUsers(data || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchLeaderboard();
  }, [user, navigate]);

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

      <div className="leaderboard-container">
        <ol>
          {users.map((u, idx) => {
            const isCurrentUser = String(u._id) === String(user._id);
            return (
              <li
                key={u._id}
                className={`leaderboard-item rank-${idx + 1} ${isCurrentUser ? 'current-user' : ''}`}
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
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
