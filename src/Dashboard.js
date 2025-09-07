import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import Game2048 from './Game2048';
import { playLetterSound } from './utils/letterSounds';
import aztecLogo from './assets/azteclogo.jpg';

const AZTEC_MILESTONES = [
  { score: 6000, letter: 'A' },
  { score: 12000, letter: 'Z' },
  { score: 18000, letter: 'T' },
  { score: 24000, letter: 'E' },
  { score: 30000, letter: 'C' },
];

const LETTER_COLORS = {
  A: '#FF4C4C',
  Z: '#4C9AFF',
  T: '#FFD700',
  E: '#32CD32',
  C: '#FF69B4',
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Dashboard({ user: initialUser, setUser: setAppUser }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [gamesLeft, setGamesLeft] = useState(7);
  const [aztecLetters, setAztecLetters] = useState([]);
  const [highlightLetters, setHighlightLetters] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showDropdown, setShowDropdown] = useState(false);

  const gameRef = useRef();
  const triggeredLettersRef = useRef([]);
  const navigate = useNavigate();

  // --- Responsive ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Fetch user info ---
  const fetchUser = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    console.log('[Dashboard] token from localStorage:', token);

    if (!token) {
      console.log('[Dashboard] No token, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/auth/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[Dashboard] /api/me response status:', res.status);

      const data = await res.json();
      console.log('[Dashboard] /api/me data:', data);

      if (!res.ok || !data) {
        console.log('[Dashboard] Invalid response, removing token & redirecting');
        localStorage.removeItem('token');
        setAppUser(null);
        navigate('/login', { replace: true });
        return;
      }

      setUser(data);
      setAppUser(data);
      setTotalScore(data.totalScore || 0);
      setGamesLeft(data.gamesLeft ?? 7);
    } catch (err) {
      console.error('[Dashboard] fetchUser error:', err);
      localStorage.removeItem('token');
      setAppUser(null);
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate, setAppUser]);


  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // --- Leaderboard position ---
  useEffect(() => {
    const fetchLeaderboardPosition = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BACKEND_URL}/auth/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let data = [];
        try {
          data = await res.json();
        } catch { }

        const sorted = Array.isArray(data)
          ? data.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
          : [];

        const pos = sorted.findIndex(u => String(u._id) === String(user._id)) + 1;
        setUserPosition(pos > 0 ? pos : '-');
      } catch (err) {
        console.error(err);
      }
    };
    fetchLeaderboardPosition();
  }, [totalScore, user]);

  // --- AZTEC letters ---
  const handleScoreChange = (currentGameScore) => {
    const letters = AZTEC_MILESTONES.filter(m => currentGameScore >= m.score).map(m => m.letter);
    const newLetters = letters.filter(l => !triggeredLettersRef.current.includes(l));
    newLetters.forEach(letter => playLetterSound(letter));
    if (newLetters.length > 0) {
      setHighlightLetters(newLetters);
      setTimeout(() => setHighlightLetters([]), 800);
    }
    triggeredLettersRef.current = [...triggeredLettersRef.current, ...newLetters];
    setAztecLetters(letters);
  };

  // --- Game over ---
  const handleGameOver = async (finalScore) => {
    setTotalScore(prev => prev + finalScore);
    handleScoreChange(finalScore);
    setGamesLeft(prev => Math.max(prev - 1, 0));

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/auth/api/update-score/${user._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score: finalScore }),
      });

      let updatedData = {};
      try {
        updatedData = await res.json();
      } catch { }

      setTotalScore(updatedData.totalScore ?? totalScore);
      setGamesLeft(updatedData.gamesLeft ?? 0);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Game reset ---
  const handleReset = () => {
    setAztecLetters([]);
    triggeredLettersRef.current = [];
    setHighlightLetters([]);
    if (gameRef.current) gameRef.current.resetGame();
  };

  // --- Logout ---
  const logout = () => {
    localStorage.removeItem('token');
    setAppUser(null);
    navigate('/login', { replace: true });
  };

  if (loading) return <p>Loading...</p>;
  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const renderAztecLetters = () => (
    <div style={{ display: 'flex', gap: '5px' }}>
      {aztecLetters.length > 0
        ? aztecLetters.map(letter => (
          <span
            key={letter}
            className={`aztec-letter-badge ${highlightLetters.includes(letter) ? 'flash' : ''}`}
            style={{
              backgroundColor: LETTER_COLORS[letter] || '#ccc',
              color: '#fff',
              padding: '5px 10px',
              borderRadius: '5px',
              fontWeight: 'bold',
              minWidth: '24px',
              textAlign: 'center',
            }}
          >
            {letter}
          </span>
        ))
        : <span>-</span>}
    </div>
  );

  return (
    <div className="dashboard-game-container">
      {!isMobile ? (
        <div className="sidebar">
          <div className="logo-container">
            <img src={aztecLogo} alt="Aztec Logo" className="logo-img" />
          </div>
          <h2 className="sidebar-title">AZTEC 2048</h2>
          <div className="profile" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={user.photo} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
            <span>{user.displayName || user.username}</span>
          </div>

          <div className="stat-card"><h4>Total Score</h4><p>{totalScore}</p></div>
          <div className="stat-card"><h4>Games Left</h4><p>{gamesLeft}</p></div>
          <div className="stat-card"><h4>AZTEC Letters</h4>{renderAztecLetters()}</div>
          <div className="stat-card"><h4>Your Position</h4><p>{userPosition || '-'}</p></div>
          <div className="stat-card"><button onClick={handleReset} disabled={gamesLeft <= 0}>Reset Game</button></div>
          <div className="stat-card">
            <Link to="/leaderboard"><button>Leaderboard</button></Link>
          </div>
          <div className="stat-card"><button onClick={logout}>Logout</button></div>
        </div>
      ) : (
        <div className="topbar-container">
          <div className="topbar">
            <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={user.photo} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
              <div className="topbar-name">{user.displayName || user.username}</div>
            </div>

            <button className="hamburger-btn" onClick={() => setShowDropdown(prev => !prev)}>☰</button>
          </div>
          <div className="mobile-stats">
            <div>Total Score: {totalScore}</div>
            <div>Games Left: {gamesLeft}</div>
            <div>AZTEC Letters: {renderAztecLetters()}</div>
            <div>Your Position: {userPosition || '-'}</div>
            <button onClick={handleReset} disabled={gamesLeft <= 0} style={{ marginTop: '10px' }}>Reset Game</button>
          </div>
          <div className={`dropdown ${showDropdown ? 'show' : ''}`}>
            <Link to="/leaderboard" onClick={() => setShowDropdown(false)}><button>Leaderboard</button></Link>
            <button onClick={logout}>Logout</button>
          </div>
        </div>
      )}

      <div className="main-content">
        {gamesLeft > 0 ? (
          <Game2048 ref={gameRef} onScoreChange={handleScoreChange} onGameOver={handleGameOver} />
        ) : (
          <p className="no-games-left">No games left this week.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
