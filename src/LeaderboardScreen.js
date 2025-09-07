import React, { useEffect, useState } from 'react';
import './LeaderboardScreen.css';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LeaderboardScreen({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return; // Wait until user is available

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${BACKEND_URL}/auth/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error('Failed to fetch leaderboard');
          setUsers([]);
          return;
        }

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
  }, [user]);

  const getRankDisplay = (rank) => {
    switch (rank) {
      case 1: return '👑🔥';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank;
    }
  };

  if (loading) return <p>Loading leaderboard...</p>;
  if (!user) return <p>Loading user data...</p>;

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h2>Leaderboard</h2>
        <button onClick={() => navigate('/dashboard')}>Back</button>
      </div>

      <div className="leaderboard-container">
        <ol>
          {users.map((u, idx) => {
            const isCurrentUser = user && String(u._id) === String(user._id);
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
