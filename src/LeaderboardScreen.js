// frontend/src/LeaderboardScreen.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LeaderboardScreen.css';

function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  console.log('BACKEND_URL:', BACKEND_URL); // Debug log

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const [lbRes, meRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/leaderboard?all=true`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/me`, { credentials: 'include' })
        ]);

        if (!lbRes.ok || !meRes.ok) throw new Error('Failed to fetch leaderboard or user data');

        const lbData = await lbRes.json();
        const currentUser = await meRes.json();

        console.log('Leaderboard data:', lbData);
        console.log('Current user data:', currentUser);

        const allUsers = lbData.leaderboard || lbData;

        setLeaderboard(allUsers.slice(0, 20));

        const userIndex = allUsers.findIndex(u => u._id === currentUser._id);
        if (userIndex >= 0) {
          setUserPosition({
            rank: userIndex + 1,
            displayName: allUsers[userIndex].displayName || allUsers[userIndex].username,
            photo: allUsers[userIndex].photo,
            totalScore: allUsers[userIndex].totalScore,
            _id: allUsers[userIndex]._id,
          });
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [BACKEND_URL]);

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
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <div className="diamond-logo"></div>
        <h2>AZTEC 2048 Leaderboard</h2>
      </div>

      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

      {userPosition && (
        <div className="user-position-card">
          <div className="user-rank">
            {getRankDisplay(userPosition.rank)}
            {userPosition.photo && (
              <img src={userPosition.photo} alt="Profile" className="user-photo" />
            )}
          </div>
          <div className="user-info">
            <span>{userPosition.displayName} (You)</span>
            <span>Score: {userPosition.totalScore}</span>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, idx) => (
              <tr
                key={player._id}
                className={`${userPosition?._id === player._id ? 'current-user-row' : ''} ${idx < 3 ? 'top-rank-row' : ''}`}
              >
                <td className="rank-cell">
                  <div className="rank-info">
                    {getRankDisplay(idx + 1)}
                    {player.photo && (
                      <img className="rank-photo" src={player.photo} alt="Profile" />
                    )}
                  </div>
                </td>
                <td>
                  {player.displayName || player.username}
                  {userPosition?._id === player._id ? ' (You)' : ''}
                </td>
                <td>{player.totalScore}</td>
              </tr>
            ))}

            {userPosition && !leaderboard.some(u => u._id === userPosition._id) && (
              <>
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center' }}>…</td>
                </tr>
                <tr key={userPosition.rank} className="current-user-row">
                  <td className="rank-cell">
                    <div className="rank-info">
                      {getRankDisplay(userPosition.rank)}
                      {userPosition.photo && (
                        <img className="rank-photo" src={userPosition.photo} alt="Profile" />
                      )}
                    </div>
                  </td>
                  <td>{userPosition.displayName || userPosition.username} (You)</td>
                  <td>{userPosition.totalScore}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LeaderboardScreen;
