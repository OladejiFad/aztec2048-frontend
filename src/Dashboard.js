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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

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

  // Handle window resize for mobile view
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Fetch current user ---
  const fetchUser = async () => {
    console.log('[DEBUG] Fetching user from:', `${BACKEND_URL}/api/me`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/me`, { credentials: 'include' });
      console.log('[DEBUG] /api/me status:', res.status);
      const data = await res.json();
      console.log('[DEBUG] /api/me response data:', data);

      if (res.ok) {
        setUser(data);
        setTotalScore(data.totalScore || 0);
        setGamesLeft(data.gamesLeft ?? 7);
      } else {
        setUser(null);
        console.error('[ERROR] /api/me:', data.error);
      }
    } catch (err) {
      setUser(null);
      console.error('[ERROR] /api/me fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // --- Fetch leaderboard position ---
  useEffect(() => {
    const fetchLeaderboardPosition = async () => {
      if (!user) return;
      console.log('[DEBUG] Fetching leaderboard from:', `${BACKEND_URL}/api/leaderboard`);
      try {
        const res = await fetch(`${BACKEND_URL}/api/leaderboard`, { credentials: 'include' });
        console.log('[DEBUG] /api/leaderboard status:', res.status);
        const data = await res.json();
        const leaderboard = Array.isArray(data) ? data : [];
        console.log('[DEBUG] /api/leaderboard response:', leaderboard);

        const sorted = leaderboard.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        const pos = sorted.findIndex(u => String(u._id) === String(user._id)) + 1;
        setUserPosition(pos > 0 ? pos : '-');
      } catch (err) {
        console.error('[ERROR] /api/leaderboard fetch failed:', err);
      }
    };
    fetchLeaderboardPosition();
  }, [totalScore, user]);

  // Track AZTEC letters for milestones
  const handleScoreChange = (score) => {
    const letters = AZTEC_MILESTONES.filter(m => score >= m.score).map(m => m.letter);
    const newLetters = letters.filter(l => !aztecLetters.includes(l));
    newLetters.forEach(letter => playLetterSound(letter));
    setAztecLetters(letters);
  };

  // Submit score to backend
  const handleGameOver = async (finalScore) => {
    if (!user || gamesLeft <= 0) return;

    console.log('[DEBUG] Submitting score:', finalScore, 'for user:', user._id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/update-score/${user._id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: finalScore }),
      });
      const updatedData = await res.json();
      console.log('[DEBUG] /api/update-score response:', updatedData);

      if (res.ok) {
        setTotalScore(updatedData.totalScore);
        setGamesLeft(updatedData.gamesLeft ?? 0);
      } else {
        console.error('[ERROR] /api/update-score:', updatedData.error);
      }
    } catch (err) {
      console.error('[ERROR] /api/update-score fetch failed:', err);
    }

    setAztecLetters([]);
  };

  // Reset game
  const handleReset = () => {
    setAztecLetters([]);
    if (gameRef.current) gameRef.current.resetGame();
  };

  // --- Popup-based Twitter login ---
  const loginWithTwitter = () => {
    const popup = window.open(
      `${BACKEND_URL}/auth/twitter`,
      'Twitter Login',
      'width=600,height=600'
    );

    const interval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(interval);
          fetchUser(); // Refresh user after login
        }
      } catch { }
    }, 500);
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return (
    <p>
      You are not logged in.{' '}
      <button onClick={loginWithTwitter}>Login with Twitter</button>
    </p>
  );

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
            <button onClick={() => window.location.href = `${BACKEND_URL}/auth/logout`}>Logout</button>
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
              <button onClick={() => window.location.href = `${BACKEND_URL}/auth/logout`}>Logout</button>
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
