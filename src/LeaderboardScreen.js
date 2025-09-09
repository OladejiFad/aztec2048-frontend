import React, { useEffect, useState } from 'react';
import './LeaderboardScreen.css';
import { useNavigate, useLocation } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const passedUser = location.state?.user;
  const [currentUser, setCurrentUser] = useState(passedUser);
  const [users, setUsers] = useState([]);
  const [userPosition, setUserPosition] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login', { replace: true });
          return;
        }

        // Fetch leaderboard
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

        setUsers(sortedUsers);

        // Fetch current user if none passed
        if (!passedUser) {
          const meRes = await fetch(`${BACKEND_URL}/auth/api/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            setCurrentUser(meData);
          } else {
            navigate('/login', { replace: true });
          }
        }

        // Set user position
        const currId = passedUser?._id;
        const idToUse = currId || (await (await fetch(`${BACKEND_URL}/auth/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })).json())._id;

        const pos =
          sortedUsers.findIndex((u) => String(u._id) === String(idToUse)) + 1;
        setUserPosition(pos > 0 ? pos : '-');
      } catch (err) {
        console.error(err);
        navigate('/login', { replace: true });
      }
    };

    fetchLeaderboard();
  }, [passedUser, navigate]);

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

  if (!currentUser) return <p>Loading...</p>;

  const currentUserId = currentUser._id;

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h2>Leaderboard</h2>
        <button onClick={() => navigate('/dashboard')}>Back</button>
      </div>

      <div className="leaderboard-container">
        {/* Highlight current user rank at the top */}
        {userPosition && (
          <div className="current-user-rank-card">
            <h4>Your Rank: {getRankDisplay(userPosition)}</h4>
            <span>{currentUser.displayName || 'Anonymous'}</span>
            <span>Score: {currentUser.totalScore || 0}</span>
          </div>
        )}

        <ol>
          {users.map((u, idx) => {
            const isCurrentUser = String(u._id) === String(currentUserId);
            const avatarUrl =
              u.photo ||
              `https://avatars.dicebear.com/api/bottts/${encodeURIComponent(
                u.email || 'user'
              )}.svg`;

            return (
              <li
                key={u._id}
                className={`leaderboard-item rank-${idx + 1} ${isCurrentUser ? 'current-user' : ''
                  }`}
              >
                <span className="leaderboard-rank">{getRankDisplay(idx + 1)}</span>
                <img src={avatarUrl} alt="Avatar" className="leaderboard-avatar" />
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
