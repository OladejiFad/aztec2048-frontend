import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Dashboard({ user: initialUser, setUser: setAppUser }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);
  const [aztecLetters, setAztecLetters] = useState([]);
  const [highlightLetters, setHighlightLetters] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showDropdown, setShowDropdown] = useState(false);

  const gameRef = useRef(null);
  const triggeredLettersRef = useRef([]);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const gamesLeft = Number(user?.gamesLeft ?? 0);
  const hasGames = gamesLeft > 0;

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
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/auth/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        localStorage.removeItem('token');
        setAppUser(null);
        navigate('/login', { replace: true });
        return;
      }
      setUser(data);
      setAppUser(data);
    } catch (err) {
      console.error(err);
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
        const data = await res.json();
        const sorted = Array.isArray(data)
          ? data.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
          : [];
        const pos =
          sorted.findIndex((u) => String(u._id) === String(user._id)) + 1;
        setUserPosition(pos > 0 ? pos : '-');
      } catch (err) {
        console.error(err);
      }
    };
    fetchLeaderboardPosition();
  }, [user]);

  // --- Close dropdown on outside click ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- AZTEC letters ---
  const handleScoreChange = (score) => {
    const letters = AZTEC_MILESTONES.filter((m) => score >= m.score).map(
      (m) => m.letter
    );

    const newLetters = letters.filter(
      (l) => !triggeredLettersRef.current.includes(l)
    );
    newLetters.forEach((letter) => playLetterSound(letter));
    if (newLetters.length > 0) setHighlightLetters(newLetters);

    triggeredLettersRef.current = [
      ...triggeredLettersRef.current,
      ...newLetters,
    ];
    setAztecLetters(letters);
  };

  useEffect(() => {
    if (highlightLetters.length === 0) return;
    const timeout = setTimeout(() => setHighlightLetters([]), 800);
    return () => clearTimeout(timeout);
  }, [highlightLetters]);

  // --- Game over ---
  const handleGameOver = async (finalScore) => {
    handleScoreChange(finalScore);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${BACKEND_URL}/auth/api/update-score/${user._id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ score: finalScore }),
        }
      );
      const updatedData = await res.json();

      const updatedUser = {
        ...user,
        totalScore: updatedData.totalScore ?? user.totalScore,
        gamesLeft: updatedData.gamesLeft ?? user.gamesLeft,
      };
      setUser(updatedUser);
      setAppUser(updatedUser);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Game reset ---
  const handleReset = () => {
    if (!hasGames) return;
    if (gameRef.current?.resetGame) {
      triggeredLettersRef.current = [];
      setAztecLetters([]);
      setHighlightLetters([]);
      gameRef.current.resetGame();
    }
  };

  // --- Leaderboard navigation ---
  const goToLeaderboard = useCallback(() => {
    setShowDropdown(false);
    navigate('/leaderboard?reload=' + Date.now(), { replace: false });
  }, [navigate]);


  // --- Logout ---
  const logout = () => {
    localStorage.removeItem('token');
    setAppUser(null);
    navigate('/login', { replace: true });
  };

  const renderAztecLetters = () => {
    const allLettersActive = aztecLetters.length === AZTEC_MILESTONES.length;
    return (
      <div className="aztec-letters-container">
        {aztecLetters.length > 0 ? (
          aztecLetters.map((letter) => {
            const justFlashed = highlightLetters.includes(letter);
            return (
              <span
                key={letter}
                aria-label={`Letter ${letter}`}
                className={`aztec-letter-badge aztec-letter-${letter} ${justFlashed ? 'flash' : ''
                  } ${allLettersActive ? 'five-letters' : ''}`}
              >
                {letter}
              </span>
            );
          })
        ) : (
          <span>-</span>
        )}
      </div>
    );
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return null;

  const avatarUrl =
    user.photo ||
    `https://avatars.dicebear.com/api/bottts/${encodeURIComponent(
      user.email || 'user'
    )}.svg`;

  return (
    <div className="dashboard-game-container">
      {!isMobile ? (
        <div className="sidebar">
          <div className="logo-container">
            <img src={aztecLogo} alt="Aztec Logo" className="logo-img" />
          </div>
          <h2 className="sidebar-title">AZTEC 2048</h2>
          <div className="profile profile-row">
            <img src={avatarUrl} alt="Avatar" />
            <span>{user.displayName || user.username}</span>
          </div>

          <div className="stat-card">
            <h4>Total Score</h4>
            <p>{user.totalScore}</p>
          </div>
          <div className="stat-card">
            <h4>Games Left</h4>
            <p>{gamesLeft}</p>
          </div>
          <div className="stat-card">
            <h4>AZTEC Letters</h4>
            {renderAztecLetters()}
          </div>
          <div className="stat-card">
            <h4>Your Position</h4>
            <p>{userPosition || '-'}</p>
          </div>
          <div className="stat-card">
            <button type="button" onClick={handleReset} disabled={!hasGames}>
              Reset Game
            </button>
          </div>
          <div className="stat-card">
            <button type="button" onClick={goToLeaderboard}>
              Leaderboard
            </button>
          </div>
          <div className="stat-card">
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div className="topbar-container">
          <div className="topbar">
            <div
              className="topbar-left"
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                }}
              />
              <div className="topbar-name">
                {user.displayName || user.username}
              </div>

              <div className="topbar-stats">
                <div className="stat-card small">
                  <h4>Games Left</h4>
                  <p>{gamesLeft}</p>
                </div>
                <div className="stat-card small">
                  <h4>AZTEC Letters</h4>
                  {renderAztecLetters()}
                </div>
              </div>
            </div>

            <div className="dropdown-wrapper" style={{ position: 'relative' }}>
              <button
                ref={buttonRef}
                className="hamburger-btn"
                onClick={() => setShowDropdown((prev) => !prev)}
                aria-label="Menu"
                aria-expanded={showDropdown}
                type="button"
              >
                ☰
              </button>

              <div
                ref={dropdownRef}
                className={`dropdown ${showDropdown ? 'show' : ''}`}
              >
                <button type="button" onClick={handleReset} disabled={!hasGames}>
                  Reset Game
                </button>
                <button type="button" onClick={goToLeaderboard}>
                  Leaderboard
                </button>
                <button type="button" onClick={logout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="main-content"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {hasGames ? (
          <Game2048
            key="playable"
            ref={gameRef}
            onScoreChange={handleScoreChange}
            onGameOver={handleGameOver}
          />
        ) : (
          <div className="no-games-left-message">
            <h2>No Games Left!</h2>
            <p>Come back later to play again.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
