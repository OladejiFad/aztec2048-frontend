// src/Dashboard.js
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
const SIZE = 4;

function Dashboard({ user: initialUser, setUser: setAppUser }) {
  const [user, setUser] = useState(initialUser);
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

  const gamesLeft = Number(user?.gamesLeft ?? 0);

  // --- Responsive ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Fetch User ---
  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/auth/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
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
    }
  }, [navigate, setAppUser]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  // --- Fetch Leaderboard position ---
  const fetchLeaderboard = useCallback(async (currentUser) => {
    if (!currentUser) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/auth/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const sorted = Array.isArray(data)
        ? data.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        : [];
      const pos = sorted.findIndex((u) => String(u._id) === String(currentUser._id)) + 1;
      setUserPosition(pos > 0 ? pos : '-');
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { if (user) fetchLeaderboard(user); }, [user, fetchLeaderboard]);

  // --- Outside click for mobile dropdown ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && buttonRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- AZTEC letters handling ---
  const handleScoreChange = useCallback((newScore) => {
    setScore(newScore);
    scoreRef.current = newScore;

    const letters = AZTEC_MILESTONES.filter((m) => newScore >= m.score).map((m) => m.letter);
    const newLetters = letters.filter((l) => !triggeredLettersRef.current.includes(l));
    newLetters.forEach(playLetterSound);
    if (newLetters.length) setHighlightLetters(newLetters);
    triggeredLettersRef.current.push(...newLetters);
    setAztecLetters(letters);

    // Game over only when all letters are unlocked
    if (letters.length === AZTEC_MILESTONES.length) setGameOver(true);
  }, []);

  useEffect(() => {
    if (!highlightLetters.length) return;
    const timeout = setTimeout(() => setHighlightLetters([]), 800);
    return () => clearTimeout(timeout);
  }, [highlightLetters]);

  // --- Board utilities ---
  const emptyBoard = useCallback(() => Array(SIZE).fill().map(() => Array(SIZE).fill(null)), []);
  const addRandomTile = useCallback((b) => {
    const empty = [];
    b.forEach((row, i) => row.forEach((val, j) => val === null && empty.push([i, j])));
    if (!empty.length) return b;
    const [i, j] = empty[Math.floor(Math.random() * empty.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    const newBoard = b.map((r) => r.slice());
    newBoard[i][j] = val;
    return newBoard;
  }, []);

  const slideAndMerge = useCallback((row) => {
    const newRow = row.filter(v => v !== null);
    let gain = 0;
    for (let i = 0; i < newRow.length - 1; i++) {
      if (newRow[i] === newRow[i + 1]) {
        newRow[i] *= 2;
        gain += newRow[i];
        newRow[i + 1] = null;
      }
    }
    const merged = newRow.filter(v => v !== null);
    while (merged.length < SIZE) merged.push(null);
    return [merged, gain];
  }, []);

  const rotateBoard = useCallback((board, times) => {
    let rotated = board.map(row => row.slice());
    for (let t = 0; t < times; t++) {
      const current = rotated;
      rotated = current[0].map((_, i) => current.map(row => row[i]).reverse());
    }
    return rotated;
  }, []);

  const canMove = useCallback((b) => {
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        if (b[i][j] === null) return true;
        if (j < SIZE - 1 && b[i][j] === b[i][j + 1]) return true;
        if (i < SIZE - 1 && b[i][j] === b[i + 1][j]) return true;
      }
    }
    return false;
  }, []);

  // NOTE: fixed up/down mapping so keyboard/touch/arrow controls move correctly
  const move = useCallback((dir) => {
    if (gameOver) return;

    let newBoard = boardRef.current.map(r => r.slice());
    let moved = false, scoreGain = 0;
    const rotateTimes = { up: 3, right: 2, down: 1, left: 0 }[dir];
    newBoard = rotateBoard(newBoard, rotateTimes);

    const newRows = newBoard.map(row => {
      const [merged, gain] = slideAndMerge(row);
      if (merged.some((v, i) => v !== row[i])) moved = true;
      scoreGain += gain;
      return merged;
    });

    newBoard = rotateBoard(newRows, (4 - rotateTimes) % 4);

    if (moved) {
      newBoard = addRandomTile(newBoard);
      setBoard(newBoard);
      boardRef.current = newBoard;
      handleScoreChange(scoreRef.current + scoreGain);
    }

    if (!canMove(newBoard)) setGameOver(true);
  }, [addRandomTile, canMove, handleScoreChange, gameOver, rotateBoard, slideAndMerge]);

  const initGame = useCallback(() => {
    const b = addRandomTile(addRandomTile(emptyBoard()));
    setBoard(b);
    boardRef.current = b;
    setScore(0);
    scoreRef.current = 0;
    setGameOver(false);
    triggeredLettersRef.current = [];
    setAztecLetters([]);
    setHighlightLetters([]);
  }, [addRandomTile, emptyBoard]);

  useEffect(() => { initGame(); }, [initGame]);

  // --- Touch & Arrow Keys ---
  useEffect(() => {
    const container = document.querySelector('.game-2048-container');
    if (!container) return;

    // touch handling
    const handleTouchStart = e => touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const handleTouchMove = e => touchEndRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const handleTouchEnd = () => {
      const dx = touchEndRef.current.x - touchStartRef.current.x;
      const dy = touchEndRef.current.y - touchStartRef.current.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20) move('right'); else if (dx < -20) move('left');
      } else {
        if (dy > 20) move('down'); else if (dy < -20) move('up');
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    // keyboard handling
    const handleKey = (e) => {
      if (e.key === 'ArrowUp') move('up');
      else if (e.key === 'ArrowDown') move('down');
      else if (e.key === 'ArrowLeft') move('left');
      else if (e.key === 'ArrowRight') move('right');
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKey);
    };
  }, [move]);

  const logout = () => {
    localStorage.removeItem('token');
    setAppUser(null);
    navigate('/login', { replace: true });
  };

  // render Aztec letters (sidebar display uses underscores until unlocked)
  const renderAztecBadge = (letter) => (
    <span
      className={`dashboard-aztec-letter-badge dashboard-aztec-letter-${letter} ${highlightLetters.includes(letter) ? 'flash' : ''} ${aztecLetters.includes(letter) ? 'unlocked' : ''}`}
    >
      {aztecLetters.includes(letter) ? letter : '_'}
    </span>
  );

  return (
    <div className="dashboard">
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <div className="dashboard-sidebar">
          <div className="dashboard-logo-container">
            <img src={aztecLogo} alt="Aztec Logo" className="dashboard-logo-img" />
            <div className="dashboard-sidebar-title">AZTEC 2048</div>
          </div>

          <div className="dashboard-profile">
            <img src={user?.photo || aztecLogo} alt="User" />
            <span>{user?.name}</span>
          </div>

          <div className="dashboard-stat-card">
            <div>Score: <strong>{score}</strong></div>
            <div>Position: <strong>{userPosition ?? '-'}</strong></div>
            <div>Games Left: <strong>{gamesLeft}</strong></div>
            <button onClick={initGame}>Restart</button>
          </div>

          <div className="dashboard-aztec-letters-container-sidebar">
            {AZTEC_MILESTONES.map(m => renderAztecBadge(m.letter))}
          </div>

          <div className="dashboard-sidebar-buttons">
            <button onClick={logout}>Logout</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="dashboard-main-content">
        {/* --- Mobile Topbar --- */}
        {isMobile && (
          <div className="dashboard-topbar">
            <div className="dashboard-topbar-left">
              <img src={aztecLogo} alt="Aztec Logo" className="dashboard-logo-img" />
              <div className="dashboard-aztec-letters-container-topbar">
                {AZTEC_MILESTONES.map(({ letter }) => (
                  <span
                    key={letter}
                    className={`dashboard-aztec-letter-badge ${highlightLetters.includes(letter) ? 'flash' : ''} ${aztecLetters.includes(letter) ? 'unlocked' : ''}`}
                  >
                    {aztecLetters.includes(letter) ? letter : '_'}
                  </span>
                ))}
              </div>
            </div>

            <div className="dashboard-topbar-right">
              <span className="dashboard-score">Score: {score}</span>
              <button
                ref={buttonRef}
                onClick={() => setShowDropdown(!showDropdown)}
                className="dashboard-dropdown-btn"
              >
                ☰
              </button>
              {showDropdown && (
                <div className="dashboard-dropdown" ref={dropdownRef}>
                  <span>Position: {userPosition}</span>
                  <span>Games Left: {gamesLeft}</span>
                  <button onClick={initGame}>Restart</button>
                  <button onClick={logout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        )}


        {/* board */}
        <div className="game-2048-container">
          <div className="game-board">
            {board.map((row, i) =>
              row.map((cell, j) => (
                <div key={`${i}-${j}`} className={`board-cell tile-${cell || 0}`}>
                  {cell && <div>{cell}</div>}
                  <div className="tile-watermark">AZTEC</div>
                </div>
              ))
            )}
          </div>

          {/* Arrow controls on desktop */}
          {!isMobile && (
            <div className="arrow-controls">
              <button onClick={() => move('up')}>↑</button>
              <button onClick={() => move('left')}>←</button>
              <button onClick={() => move('down')}>↓</button>
              <button onClick={() => move('right')}>→</button>
            </div>
          )}

          {gameOver && (
            <div className="game-over-overlay">
              <h2>Game Over</h2>
              <h4>Score: {score}</h4>
              <button onClick={initGame}>Restart</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
