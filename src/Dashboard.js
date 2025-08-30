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
  const popupRef = useRef(null);
  const popupIntervalRef = useRef(null);

  // --- Responsive ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Fetch user info ---
  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/api/me`, {
        credentials: 'include', // cookie-based auth
      });
      const data = await res.json();
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

  // --- Leaderboard position ---
  useEffect(() => {
    const fetchLeaderboardPosition = async () => {
      if (!user) return;
      try {
        const res = await fetch(`${BACKEND_URL}/auth/api/leaderboard`, {
          credentials: 'include',
        });
        const data = await res.json();
        const leaderboard = Array.isArray(data.leaderboard) ? data.leaderboard : [];
        const sorted = leaderboard.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        const pos = sorted.findIndex(u => String(u._id) === String(user._id)) + 1;
        setUserPosition(pos > 0 ? pos : '-');
      } catch (err) {
        console.error('[ERROR] /api/leaderboard fetch failed:', err);
      }
    };
    fetchLeaderboardPosition();
  }, [totalScore, user]);

  // --- AZTEC letters ---
  const handleScoreChange = (score) => {
    const letters = AZTEC_MILESTONES.filter(m => score >= m.score).map(m => m.letter);
    const newLetters = letters.filter(l => !aztecLetters.includes(l));
    newLetters.forEach(letter => playLetterSound(letter));
    setAztecLetters(letters);
  };

  // --- Game over ---
  const handleGameOver = async (finalScore) => {
    if (!user || gamesLeft <= 0) return;
    try {
      const res = await fetch(`${BACKEND_URL}/auth/api/update-score/${user._id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: finalScore }),
      });
      const updatedData = await res.json();
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

  const handleReset = () => {
    setAztecLetters([]);
    if (gameRef.current) gameRef.current.resetGame();
  };

  // --- Twitter login popup ---
  const loginWithTwitter = () => {
    popupRef.current = window.open(
      `${BACKEND_URL}/auth/twitter`,
      'Twitter Login',
      'width=600,height=600'
    );

    popupIntervalRef.current = setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        clearInterval(popupIntervalRef.current);
        popupIntervalRef.current = null;
        fetchUser();
      }
    }, 500);
  };

  // --- Logout ---
  const logout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, { credentials: 'include' });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setUser(null);
    }
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
            <button onClick={logout}>Logout</button>
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
              <button onClick={logout}>Logout</button>
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
