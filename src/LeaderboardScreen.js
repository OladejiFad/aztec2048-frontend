import React, { useEffect, useState } from 'react';
import './LeaderboardScreen.css';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LeaderboardScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/auth/leaderboard`);
        if (!res.ok) throw new Error('Failed to fetch leaderboard');

        const data = await res.json();
        setUsers(data || []);
      } catch (err) {
        console.error(err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
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

  if (loading) return <p>Loading leaderboard...</p>;

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h2>Leaderboard</h2>
        <button onClick={() => navigate('/dashboard')}>Back</button>
      </div>
      <div className="leaderboard-container">
        <ol>
          {users.map((u, idx) => (
            <li key={u._id} className={`leaderboard-item rank-${idx + 1}`}>
              <span className="leaderboard-rank">{getRankDisplay(idx + 1)}</span>
              <img
                src={u.photo || `https://avatars.dicebear.com/api/bottts/${encodeURIComponent(u.email)}.svg`}
                alt="Avatar"
                className="leaderboard-avatar"
              />
              <span className="leaderboard-name">{u.displayName || 'Anonymous'}</span>
              <span className="leaderboard-score">{u.totalScore || 0}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
