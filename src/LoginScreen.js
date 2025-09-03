import React, { useEffect, useState } from 'react';
import './LeaderboardScreen.css';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LeaderboardScreen({ user }) {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return; // just in case
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/leaderboard`, { credentials: 'include' });
        const data = await res.json();
        setUsers(data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLeaderboard();
  }, [user]);

  const getRankDisplay = (rank) => {
    switch (rank) {
      case 1: return '👑🔥';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank;
    }
  };

  return (
    <div className="leaderboard-container">
      <h2>Leaderboard</h2>
      <button onClick={() => navigate('/dashboard')}>Back</button>
      <ol>
        {users.map((u, idx) => (
          <li key={u._id} className={`leaderboard-item rank-${idx + 1}`}>
            <span className="leaderboard-rank">{getRankDisplay(idx + 1)}</span>
            <img
              src={u.photo || `https://avatars.dicebear.com/api/initials/${encodeURIComponent(u.displayName)}.svg`}
              alt="Avatar"
            />
            <span className="leaderboard-name">{u.displayName}</span>
            <span className="leaderboard-score">{u.totalScore}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
