import React, { useEffect, useState, useRef } from 'react';
import './Dashboard.css';
import Game2048 from './Game2048';
import { Link } from 'react-router-dom';
import { playLetterSound } from './utils/letterSounds';

const AZTEC_MILESTONES = [
  { score: 6000, letter: 'A' },
  { score: 12000, letter: 'Z' },
  { score: 18000, letter: 'T' },
  { score: 24000, letter: 'E' },
  { score: 30000, letter: 'C' },
];

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [gamesLeft, setGamesLeft] = useState(7);
  const [aztecLetters, setAztecLetters] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showDropdown, setShowDropdown] = useState(false);

  const gameRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/me', { credentials: 'include' });
        if (!res.ok) throw new Error('Not authenticated');
        const data = await res.json();
        setUser(data);
        setTotalScore(data.totalScore || 0);
        setGamesLeft(data.gamesLeft ?? 7);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchLeaderboardPosition = async () => {
      if (!user) return;
      try {
        const res = await fetch('http://localhost:5000/api/leaderboard', { credentials: 'include' });
        if (!res.ok) return;
        const lb = await res.json();
        const sorted = lb.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        const pos = sorted.findIndex(u => u._id.toString() === user._id.toString()) + 1;
        setUserPosition(pos > 0 ? pos : '-');
      } catch (err) {
        console.error(err);
      }
    };
    fetchLeaderboardPosition();
  }, [totalScore, user]);

  const handleScoreChange = (score) => {
    const letters = AZTEC_MILESTONES.filter(m => score >= m.score).map(m => m.letter);

    // Play sound only for newly reached letters
    const newLetters = letters.filter(l => !aztecLetters.includes(l));
    newLetters.forEach(letter => playLetterSound(letter));

    setAztecLetters(letters);
  };

  const handleGameOver = async (finalScore) => {
    if (!user || gamesLeft <= 0) return;

    try {
      const res = await fetch(`http://localhost:5000/api/update-score/${user._id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: finalScore }),
      });
      const updatedData = await res.json();
      if (res.ok) setTotalScore(updatedData.totalScore);
      else console.error(updatedData.error || 'Failed to update score');
    } catch (err) {
      console.error(err);
    }

    setGamesLeft(prev => prev - 1);
    setAztecLetters([]);
  };

  const handleReset = () => {
    setAztecLetters([]);
    if (gameRef.current) gameRef.current.resetGame();
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>You are not logged in. <a href="http://localhost:5000/auth/twitter">login with Twitter</a>.</p>;

  return (
    <div className="dashboard-game-container">
      {!isMobile ? (
        <div className="sidebar">
          <h2>AZTEC 2048</h2>
          <div className="profile">
            {user.photo && <img src={user.photo} alt="Profile" />}
            <p>{user.displayName || user.username}</p>
          </div>
          <div className="stat-card"><h4>Total Score</h4><p>{totalScore}</p></div>
          <div className="stat-card"><h4>Games Left</h4><p>{gamesLeft}</p></div>
          <div className="stat-card"><h4>AZTEC Letters</h4><p>{aztecLetters.join(' ') || '-'}</p></div>
          <div className="stat-card"><h4>Your Position</h4><p>{userPosition || '-'}</p></div>

          <div className="stat-card">
            <button onClick={handleReset} disabled={gamesLeft <= 0}>Reset Game</button>
          </div>

          <div className="stat-card">
            <button onClick={() => window.location.href = 'http://localhost:5000/auth/logout'}>Logout</button>
          </div>

          <div className="stat-card">
            <Link to="/leaderboard">View Full Leaderboard</Link>
          </div>
        </div>
      ) : (
        <div className="topbar-container">
          <div className="topbar">
            <div className="topbar-left">
              {user.photo && <img src={user.photo} alt="Profile" className="topbar-profile-img" />}
              <div className="topbar-name">{user.displayName || user.username}</div>
            </div>
            <button className="hamburger-btn" onClick={() => setShowDropdown(prev => !prev)}>☰</button>
          </div>

          <div className="mobile-stats">
            <div>Total Score: {totalScore}</div>
            <div>Games Left: {gamesLeft}</div>
            <div>AZTEC Letters: {aztecLetters.join(' ') || '-'}</div>
            <div>Your Position: {userPosition || '-'}</div>
            <button onClick={handleReset} disabled={gamesLeft <= 0} style={{ marginTop: '10px' }}>Reset Game</button>
          </div>

          {showDropdown && (
            <div className="dropdown">
              <button onClick={() => window.location.href = 'http://localhost:5000/auth/logout'}>Logout</button>
              <Link to="/leaderboard">View Full Leaderboard</Link>
            </div>
          )}
        </div>
      )}

      <div className="main-content">
        {gamesLeft > 0
          ? <Game2048
            ref={gameRef}
            onScoreChange={handleScoreChange}
            onGameOver={handleGameOver}
          />
          : <p className="no-games-left">No games left this week.</p>}
      </div>
    </div>
  );
}

export default Dashboard;
