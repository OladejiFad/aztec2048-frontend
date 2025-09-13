import React, { useEffect, useState } from 'react';
import './LeaderboardScreen.css';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
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
        const sortedUsers = Array.isArray(data)
          ? data.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
          : [];

        // ✅ only top 100
        setUsers(sortedUsers.slice(0, 100));

        const meRes = await fetch(`${BACKEND_URL}/auth/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) {
          navigate('/login', { replace: true });
          return;
        }
        const meData = await meRes.json();
        setCurrentUser(meData);

        const pos =
          sortedUsers.findIndex((u) => String(u._id) === String(meData._id)) + 1;
        setUserPosition(pos > 0 ? pos : '-');
      } catch (err) {
        console.error(err);
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [navigate]);

  const getRankDisplay = (rank) => {
    switch (rank) {
      case 1:
        return '👑🔥';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return rank;
    }
  };

  const getAvatarUrl = (u) =>
    u?.photo ||
    `https://robohash.org/${encodeURIComponent(u?.email || 'user')}?set=set2&size=64x64`;

  if (loading) return <p>Loading leaderboard...</p>;
  if (!currentUser) return <p>No user data</p>;

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h2>Leaderboard</h2>
        <button onClick={() => navigate('/dashboard')}>Back</button>
      </div>

      <div className="leaderboard-container">
        {userPosition && (
          <div className="current-user-rank-card">
            <h4>Your Rank: {getRankDisplay(userPosition)}</h4>
            <span>{currentUser.displayName || 'Anonymous'}</span>
            <span>Score: {currentUser.totalScore || 0}</span>
          </div>
        )}

        <ol>
          {users.map((u, idx) => {
            const isCurrentUser = String(u._id) === String(currentUser._id);

            return (
              <li
                key={u._id}
                className={`leaderboard-item rank-${idx + 1} ${isCurrentUser ? 'current-user' : ''
                  }`}
              >
                <span className="leaderboard-rank">
                  {getRankDisplay(idx + 1)}
                </span>
                <img
                  src={getAvatarUrl(u)}
                  alt="Avatar"
                  className="leaderboard-avatar"
                />
                <span className="leaderboard-name">
                  {u.displayName || 'Anonymous'}
                </span>
                <span className="leaderboard-score">{u.totalScore || 0}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
