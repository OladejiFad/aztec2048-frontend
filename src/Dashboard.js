import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
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

  const [board, setBoard] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const triggeredLettersRef = useRef([]);
  const boardRef = useRef([]);
  const scoreRef = useRef(0);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchEndRef = useRef({ x: 0, y: 0 });

  const SIZE = 4;
  const gamesLeft = Number(user?.gamesLeft ?? 0);
  const hasGames = gamesLeft > 0;

  // --- Responsive detection ---
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

  useEffect(() => { fetchUser(); }, [fetchUser]);

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
  const handleScoreChange = useCallback((newScore) => {
    setScore(newScore);
    scoreRef.current = newScore;

    const letters = AZTEC_MILESTONES.filter((m) => newScore >= m.score).map(
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
  }, []);

  useEffect(() => {
    if (highlightLetters.length === 0) return;
    const timeout = setTimeout(() => setHighlightLetters([]), 800);
    return () => clearTimeout(timeout);
  }, [highlightLetters]);

  // --- Game logic ---
  const emptyBoard = useCallback(
    () => Array(SIZE).fill().map(() => Array(SIZE).fill(null)),
    []
  );

  const addRandomTile = useCallback((b) => {
    const empty = [];
    b.forEach((row, i) =>
      row.forEach((val, j) => {
        if (val === null) empty.push([i, j]);
      })
    );
    if (empty.length === 0) return b;
    const [i, j] = empty[Math.floor(Math.random() * empty.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    const newBoard = b.map((r) => r.slice());
    newBoard[i][j] = val;
    return newBoard;
  }, []);

  const updateScoreBackend = useCallback(async (finalScore) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/auth/api/update-score/${user._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score: finalScore }),
      });
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
  }, [user, setAppUser]);

  const canMove = useCallback((b) => {
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++) {
        if (b[i][j] === null) return true;
        if (i < SIZE - 1 && b[i][j] === b[i + 1][j]) return true;
        if (j < SIZE - 1 && b[i][j] === b[i][j + 1]) return true;
      }
    return false;
  }, []);

  const move = useCallback(
    (dir) => {
      if (gameOver) return;

      let rotated = boardRef.current.map(r => r.slice());

      const rotate = (b) => {
        const res = emptyBoard();
        for (let i = 0; i < SIZE; i++)
          for (let j = 0; j < SIZE; j++) res[i][j] = b[j][SIZE - 1 - i];
        return res;
      };

      const slideRow = (row) => {
        let newRow = row.filter((v) => v !== null);
        for (let i = 0; i < newRow.length - 1; i++) {
          if (newRow[i] === newRow[i + 1]) {
            newRow[i] *= 2;
            newRow[i + 1] = null;
            handleScoreChange(scoreRef.current + newRow[i]);
          }
        }
        newRow = newRow.filter((v) => v !== null);
        while (newRow.length < SIZE) newRow.push(null);
        return newRow;
      };

      for (let i = 0; i < dir; i++) rotated = rotate(rotated);
      const newBoard = rotated.map(slideRow);
      for (let i = 0; i < (4 - dir) % 4; i++) rotated = rotate(newBoard);

      const boardWithTile = addRandomTile(rotated);
      boardRef.current = boardWithTile;
      setBoard(boardWithTile);

      if (!canMove(boardWithTile)) {
        setGameOver(true);
        updateScoreBackend(scoreRef.current);
      }
    },
    [gameOver, emptyBoard, addRandomTile, canMove, handleScoreChange, updateScoreBackend]
  );

  const initGame = useCallback(() => {
    if (!hasGames) return;
    triggeredLettersRef.current = [];
    setAztecLetters([]);
    setHighlightLetters([]);
    setScore(0);
    scoreRef.current = 0;
    setGameOver(false);
    let b = emptyBoard();
    b = addRandomTile(b);
    b = addRandomTile(b);
    boardRef.current = b;
    setBoard(b);
  }, [hasGames, emptyBoard, addRandomTile]);

  // --- Keyboard controls ---
  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowUp': move(0); break;
        case 'ArrowRight': move(1); break;
        case 'ArrowDown': move(2); break;
        case 'ArrowLeft': move(3); break;
        default: break;
      }
    },
    [move]
  );

  // --- Touch controls ---
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    touchEndRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(() => {
    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;

    if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      deltaX > 0 ? move(1) : move(3); // right : left
    } else {
      deltaY > 0 ? move(2) : move(0); // down : up
    }

    touchStartRef.current = { x: 0, y: 0 };
    touchEndRef.current = { x: 0, y: 0 };
  }, [move]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    const container = document.querySelector('.game-2048-container');
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    initGame();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleKeyDown, initGame, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const handleReset = useCallback(() => initGame(), [initGame]);
  const goToLeaderboard = useCallback(() => { setShowDropdown(false); navigate('/leaderboard'); }, [navigate]);
  const logout = () => { localStorage.removeItem('token'); setAppUser(null); navigate('/login', { replace: true }); };

  const renderAztecLetters = () => {
    const allLettersActive = aztecLetters.length === AZTEC_MILESTONES.length;
    return (
      <div className="dashboard-aztec-letters-container">
        {aztecLetters.length > 0 ? (
          aztecLetters.map((letter) => {
            const justFlashed = highlightLetters.includes(letter);
            return (
              <span
                key={letter}
                aria-label={`Letter ${letter}`}
                className={`dashboard-aztec-letter-badge dashboard-aztec-letter-${letter} ${justFlashed ? 'flash' : ''} ${allLettersActive ? 'five-letters' : ''}`}
              >
                {letter}
              </span>
            );
          })
        ) : (<span>-</span>)}
      </div>
    );
  };

  const renderBoard = () => (
    <div className="game-2048-container">
      <div className="score score-default">{score}</div>
      <div className="game-board">
        {board.map((row, i) =>
          row.map((val, j) => (
            <div key={`${i}-${j}`} className={`board-cell tile-${val ?? 0}`}>
              {val && <div>{val}</div>}
              {val && <div className="tile-watermark">AZTEC</div>}
            </div>
          ))
        )}
      </div>
      {gameOver && (
        <div className="game-over-overlay">
          <h2>Game Over</h2>
          <h4>Your Score: {score}</h4>
          <p>{gamesLeft === 0 ? "No Games Left!" : "Try Again!"}</p>
          <button onClick={handleReset} disabled={!hasGames}>Restart</button>
        </div>
      )}
    </div>
  );

  if (loading) return <p>Loading...</p>;
  if (!user) return null;

  const avatarUrl =
    user.photo ||
    `https://robohash.org/${encodeURIComponent(user.email || 'user')}?set=set2&size=128x128`;

  return (
    <div className="dashboard dashboard-game-container">
      {!isMobile ? (
        <div className="dashboard-sidebar">
          <div className="dashboard-logo-container">
            <img src={aztecLogo} alt="Aztec Logo" className="dashboard-logo-img" />
          </div>
          <h2 className="dashboard-sidebar-title">AZTEC 2048</h2>
          <div className="dashboard-profile dashboard-profile-row">
            <img src={avatarUrl} alt="Avatar" />
            <span title={user.displayName || user.username}>{user.displayName || user.username}</span>
          </div>

          <div className="dashboard-stat-card">
            <h4>Total Score</h4>
            <p>{user.totalScore}</p>
          </div>
          <div className="dashboard-stat-card">
            <h4>Games Left</h4>
            <p>{gamesLeft}</p>
          </div>
          <div className="dashboard-stat-card">
            <h4>AZTEC Letters</h4>
            {renderAztecLetters()}
          </div>
          <div className="dashboard-stat-card">
            <h4>Your Position</h4>
            <p>{userPosition || '-'}</p>
          </div>
          <div className="dashboard-stat-card">
            <button type="button" onClick={handleReset} disabled={!hasGames}>Reset</button>
          </div>
          <div className="dashboard-stat-card">
            <button type="button" onClick={goToLeaderboard}>Leaderboard</button>
          </div>
          <div className="dashboard-stat-card">
            <button type="button" onClick={logout}>Logout</button>
          </div>
        </div>
      ) : (
        <div className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <img src={avatarUrl || "logo.png"} alt="Profile" />
            <div className="game-left">
              Game Left: <span>{gamesLeft}</span>
            </div>
            <div className="dashboard-aztec-letters-container">
              <span className="dashboard-aztec-letter-badge dashboard-aztec-letter-A">A</span>
              <span className="dashboard-aztec-letter-badge dashboard-aztec-letter-Z">Z</span>
              <span className="dashboard-aztec-letter-badge dashboard-aztec-letter-T">T</span>
              <span className="dashboard-aztec-letter-badge dashboard-aztec-letter-E">E</span>
              <span className="dashboard-aztec-letter-badge dashboard-aztec-letter-C">C</span>
            </div>
          </div>

          <div className="dashboard-topbar-right">
            <button onClick={() => setShowDropdown(!showDropdown)}>☰</button>
            {showDropdown && (
              <div className="dashboard-dropdown">
                <button onClick={handleReset} disabled={!hasGames}>Reset</button>
                <button onClick={goToLeaderboard}>Leaderboard</button>
                <button onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </div>

      )}
      <div className="dashboard-main-content">{renderBoard()}</div>
    </div>
  );
}

export default Dashboard;
