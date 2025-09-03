import React, { useEffect, useState } from 'react';
import './Leaderboard.css'; // ✅ Leaderboard CSS
import { useNavigate } from 'react-router-dom';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/leaderboard`, { credentials: 'include' });
        const data = await res.json();
        setUsers(data || []);
      } catch (err) { console.error(err); }
    };
    fetchLeaderboard();
  }, []);

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
          <li key={u._id}>
            <span>{getRankDisplay(idx + 1)} {u.displayName || u.username}</span>
            <span>Score: {u.totalScore}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
