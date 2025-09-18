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
const PUZZLE_WORD = "AZTECPUZZLE".split('');

function Dashboard({ user: initialUser, setUser: setAppUser }) {
  const [user, setUser] = useState(initialUser);
 
  const [highlightLetters, setHighlightLetters] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showDropdown, setShowDropdown] = useState(false);
  const [board, setBoard] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [activeGame, setActiveGame] = useState('2048'); // '2048' or 'puzzle'

  const triggeredLettersRef = useRef([]);
  const boardRef = useRef([]);
  const scoreRef = useRef(0);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchEndRef = useRef({ x: 0, y: 0 });

  const gamesLeft = Number(user?.gamesLeft ?? 0);

  // --- AZTEC Sliding Puzzle ---
  
const PUZZLE_COLS = 3; // used for grid calculations
const [tiles, setTiles] = useState([]);
const [emptyIndex, setEmptyIndex] = useState(PUZZLE_WORD.length);
const [puzzleSolved, setPuzzleSolved] = useState(false);

const [puzzlePointsEarned, setPuzzlePointsEarned] = useState(0);


const initPuzzle = useCallback(() => {
  let t = [...PUZZLE_WORD, ''];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  setTiles(t);
  setEmptyIndex(t.indexOf(''));
  setPuzzleSolved(false);
}, []); // empty array


  const canMoveTile = (index) => {
    const row = Math.floor(index / PUZZLE_COLS);
    const col = index % PUZZLE_COLS;
    const emptyRow = Math.floor(emptyIndex / PUZZLE_COLS);
    const emptyCol = emptyIndex % PUZZLE_COLS;
    return (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
           (Math.abs(col - emptyCol) === 1 && row === emptyRow);
  };

const moveTile = (index) => {
  if (!canMoveTile(index) || puzzleSolved) return;

  const newTiles = [...tiles];
  [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
  setTiles(newTiles);
  setEmptyIndex(index);

  if (newTiles.slice(0, PUZZLE_WORD.length).join('') === PUZZLE_WORD.join('')) {
    setPuzzleSolved(true);

    const points = 35000;
    setPuzzlePointsEarned(points);

    // Add points to score
    handleScoreChange(scoreRef.current + points);
  }
};


 useEffect(() => { initPuzzle(); }, [initPuzzle]);




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
    } finally {
      
    }
  }, [navigate, setAppUser]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  // --- Dropdown close ---
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

  // --- Save score ---
  const saveScore = useCallback(async () => {
    if (!user?._id || score <= 0) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${BACKEND_URL}/auth/api/update-score/${user._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchUser();
      } else {
        console.error("Failed to save score:", data.error);
      }
    } catch (err) {
      console.error("Error saving score:", err);
    }
  }, [user?._id, score, fetchUser]);

  // --- AZTEC letters ---
  const handleScoreChange = useCallback((newScore) => {
    setScore(newScore);
    scoreRef.current = newScore;
    const earnedLetters = AZTEC_MILESTONES
      .filter((m) => newScore >= m.score)
      .map((m) => m.letter);
    const newLetters = earnedLetters.filter(l => !triggeredLettersRef.current.includes(l));
    if (newLetters.length) {
      newLetters.forEach(playLetterSound);
      setHighlightLetters(newLetters);
    }
    triggeredLettersRef.current.push(...newLetters);
    if (triggeredLettersRef.current.length === 5) {
      alert("🎉 Congratulations! You completed AZTEC. Game Over!");
      setGameOver(true);
      saveScore();
    }
  }, [saveScore]);

  useEffect(() => {
    if (!highlightLetters.length) return;
    const timeout = setTimeout(() => setHighlightLetters([]), 800);
    return () => clearTimeout(timeout);
  }, [highlightLetters]);

  // --- 2048 Board logic ---
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
    if (!canMove(newBoard)) {
      setGameOver(true);
      saveScore();
    }
  }, [addRandomTile, canMove, handleScoreChange, gameOver, rotateBoard, slideAndMerge, saveScore]);

  const initGame = useCallback(() => {
    const b = addRandomTile(addRandomTile(emptyBoard()));
    setBoard(b);
    boardRef.current = b;
    setScore(0);
    scoreRef.current = 0;
    setGameOver(false);
    triggeredLettersRef.current = [];
  }, [addRandomTile, emptyBoard]);

  useEffect(() => { initGame(); }, [initGame]);

  // --- Touch & Arrow Keys ---
useEffect(() => {
  const containerSelector = activeGame === '2048' 
    ? '.game-2048-container' 
    : '.puzzle-container';
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Touch handlers
  const handleTouchStart = e => touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  const handleTouchMove = e => touchEndRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  const handleTouchEnd = () => {
    const dx = touchEndRef.current.x - touchStartRef.current.x;
    const dy = touchEndRef.current.y - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20) move('right');
      else if (dx < -20) move('left');
    } else {
      if (dy > 20) move('down');
      else if (dy < -20) move('up');
    }
  };

  container.addEventListener('touchstart', handleTouchStart);
  container.addEventListener('touchmove', handleTouchMove);
  container.addEventListener('touchend', handleTouchEnd);

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
}, [activeGame, move]);


  // --- Logout ---
  const logout = () => {
    localStorage.removeItem('token');
    setAppUser(null);
    navigate('/login', { replace: true });
  };

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
            <span>{user?.displayName}</span>
          </div>
          <div className="dashboard-stat-card">
            <span>Total Score: {user?.totalScore ?? 0}</span>
            <span>Position: {user?.position ?? '-'}</span>
            <span>Games Left: {gamesLeft}</span>
            <div className="dashboard-aztec-letters-container">
              {['A', 'Z', 'T', 'E', 'C'].map((l) => (
                <span
                  key={l}
                  className={`dashboard-aztec-letter-badge
                  ${triggeredLettersRef.current.includes(l) ? `dashboard-aztec-letter-${l}` : ''}
                  ${highlightLetters.includes(l) ? 'flash' : ''}`}
                >
                  {l}
                </span>
              ))}
            </div>
            <button onClick={() => navigate('/leaderboard')}>Leaderboard</button>
            <button onClick={initGame}>Restart</button>
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
              <span>{user?.displayName}</span>
              <span>Total: {user?.totalScore ?? 0}</span>
            </div>
            <div className="dashboard-topbar-right">
              <button ref={buttonRef} onClick={() => setShowDropdown(!showDropdown)}>☰</button>
              {showDropdown && (
                <div className="dashboard-dropdown" ref={dropdownRef}>
                  <span>Games Left: {gamesLeft}</span>
                  <span>Position: {user?.position ?? '-'}</span>
                  <button onClick={() => navigate('/leaderboard')}>Leaderboard</button>
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
              className={`dashboard-aztec-letter-badge
                ${triggeredLettersRef.current.includes(l) ? `dashboard-aztec-letter-${l}` : ''}
                 ${highlightLetters.includes(l) ? 'flash' : ''}`}
            >
              {l}
            </span>
          ))}
        </div>

        {/* --- Game Selector Tabs --- */}
        {gamesLeft > 0 ? (
          <div className="game-selector-container">
            <div className="game-selector-tabs">
              <button
                className={activeGame === '2048' ? 'active' : ''}
                onClick={() => setActiveGame('2048')}
              >
                2048 Game
              </button>
              <button
                className={activeGame === 'puzzle' ? 'active' : ''}
                onClick={() => setActiveGame('puzzle')}
              >
                Sliding Puzzle
              </button>
            </div>

            {activeGame === '2048' && (
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
                {gameOver && (
                  <div className="game-over-overlay">
                    <h2>Game Over</h2>
                    <h4>Score: {score}</h4>
                    <button onClick={initGame}>Restart</button>
                  </div>
                )}
              </div>
            )}

           {activeGame === 'puzzle' && (
  <div className="puzzle-container">
    <h3>AZTEC Sliding Puzzle</h3>
    
    <div
      className="puzzle-grid"
      style={{ gridTemplateColumns: `repeat(${PUZZLE_COLS}, 1fr)` }}
    >
     {tiles.map((tile, idx) => {
  const tileClass = tile ? `tile tile-${tile}` : 'tile empty';
  return (
    <div
      key={idx}
      className={tileClass}
      onClick={() => moveTile(idx)}
    >
      {tile}
    </div>
  );
})}

    </div>

        {/* ✅ Puzzle Solved Overlay */}
       {puzzleSolved && (
  <div className="puzzle-solved-overlay">
    <h2>🎉 Puzzle Solved!</h2>
    <p>Points Earned: {puzzlePointsEarned}</p>
    <button onClick={() => { initPuzzle(); setPuzzlePointsEarned(0); }}>
      Restart Puzzle
    </button>
  </div>
)}

      </div>
    )}

          </div>
        ) : (
          <div className="no-games-left-message">
            <h3>No Games Left ♣</h3>
            <p>Please wait for weekly reset or check your progress!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
