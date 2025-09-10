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
  // eslint-disable-next-line no-unused-vars
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

  const gamesLeft = Number(user?.gamesLeft ?? 0);

  // --- Responsive ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Fetch User ---
  const fetchUser = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [navigate, setAppUser]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  // --- Fetch Leaderboard ---
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

  // --- Dropdown ---
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

  // --- AZTEC letters ---
  const handleScoreChange = useCallback((newScore) => {
    setScore(newScore);
    scoreRef.current = newScore;

    const letters = AZTEC_MILESTONES.filter((m) => newScore >= m.score).map((m) => m.letter);
    const newLetters = letters.filter((l) => !triggeredLettersRef.current.includes(l));
    newLetters.forEach(playLetterSound);
    if (newLetters.length) setHighlightLetters(newLetters);
    triggeredLettersRef.current.push(...newLetters);
    setAztecLetters(letters);
  }, []);

  useEffect(() => {
    if (!highlightLetters.length) return;
    const timeout = setTimeout(() => setHighlightLetters([]), 800);
    return () => clearTimeout(timeout);
  }, [highlightLetters]);

  // --- Board logic ---
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
      const newRotated = current[0].map((_, i) => current.map(row => row[i]).reverse());
      rotated = newRotated;
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

  const move = useCallback((dir) => {
    if (gameOver) return;

    let newBoard = boardRef.current.map(r => r.slice());
    let moved = false, scoreGain = 0;
    const rotateTimes = { up: 1, right: 2, down: 3, left: 0 }[dir];
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
  }, [addRandomTile, emptyBoard]);

  useEffect(() => { initGame(); }, [initGame]);

  // --- Touch & Arrow Keys ---
  useEffect(() => {
    const container = document.querySelector('.game-2048-container');
    if (!container) return;

    // --- Touch ---
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

    // --- Keyboard ---
    const handleKey = e => {
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

  // --- Logout ---
  const logout = () => {
    localStorage.removeItem('token');
    setAppUser(null);
    navigate('/login', { replace: true });
  };

  // --- Render ---
  return (
    <div className="dashboard">
      {/* --- Sidebar --- */}
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
            <span>Score: {score}</span>
            <span>Position: {userPosition}</span>
            <span>Games Left: {gamesLeft}</span>
            <button onClick={initGame}>Restart</button>
          </div>
          <div className="dashboard-sidebar-buttons">
            <button onClick={logout}>Logout</button>
          </div>
        </div>
      )}

      {/* --- Main Content --- */}
      <div className="dashboard-main-content">
        {isMobile && (
          <div className="dashboard-topbar">
            <div className="dashboard-topbar-left">
              <img src={user?.photo || aztecLogo} alt="User" />
              <span className="game-left">{user?.name}</span>
            </div>
            <div className="dashboard-topbar-right">
              <button ref={buttonRef} onClick={() => setShowDropdown(!showDropdown)}>☰</button>
              {showDropdown && (
                <div className="dashboard-dropdown" ref={dropdownRef}>
                  <button onClick={initGame}>Restart</button>
                  <button onClick={logout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="dashboard-aztec-letters-container">
          {['A', 'Z', 'T', 'E', 'C'].map((l) => (
            <span
              key={l}
              className={`dashboard-aztec-letter-badge dashboard-aztec-letter-${l} ${highlightLetters.includes(l) ? 'flash' : ''} ${aztecLetters.includes(l) && aztecLetters.length === 5 ? 'five-letters' : ''}`}>
              {l}
            </span>
          ))}
        </div>

        <div className="game-2048-container">
          <div className="score">Score: {score}</div>
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
