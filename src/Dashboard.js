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
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const touchStartRef = useRef(null);

  const SIZE = 4;
  const gamesLeft = Number(user?.gamesLeft ?? 0);
  const hasGames = gamesLeft > 0;

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  useEffect(() => {
    const handleResize = debounce(() => setIsMobile(window.innerWidth <= 768), 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleScoreChange = useCallback((newScore) => {
    setScore(newScore);
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

  // ---- MOVE function ----
  const move = useCallback(
    (dir) => {
      if (gameOver) return;
      let rotated = board.map((r) => r.slice());
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
            handleScoreChange(score + newRow[i]);
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
      setBoard(boardWithTile);
      if (!canMove(boardWithTile)) {
        setGameOver(true);
        updateScoreBackend(score);
      }
    },
    [board, gameOver, score, emptyBoard, addRandomTile, canMove, handleScoreChange, updateScoreBackend]
  );

  // --- TOUCH USEEFFECT (moved here AFTER move) ---
  useEffect(() => {
    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };
    const handleTouchEnd = (e) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const minSwipe = 30;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > minSwipe) move(1);
        else if (deltaX < -minSwipe) move(3);
      } else {
        if (deltaY > minSwipe) move(2);
        else if (deltaY < -minSwipe) move(0);
      }
      touchStartRef.current = null;
    };
    const gameContainer = document.querySelector('.game-2048-container');
    if (gameContainer) {
      gameContainer.addEventListener('touchstart', handleTouchStart);
      gameContainer.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      if (gameContainer) {
        gameContainer.removeEventListener('touchstart', handleTouchStart);
        gameContainer.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [move]);

  // --- the rest of your code remains unchanged ---
  const initGame = useCallback(() => {
    if (!hasGames) return;
    triggeredLettersRef.current = [];
    setAztecLetters([]);
    setHighlightLetters([]);
    setScore(0);
    setGameOver(false);
    let b = emptyBoard();
    b = addRandomTile(b);
    b = addRandomTile(b);
    setBoard(b);
  }, [hasGames, emptyBoard, addRandomTile]);

  const handleKeyDown = useCallback(
    (e) => {
      if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        switch (e.key) {
          case 'ArrowUp': move(0); break;
          case 'ArrowRight': move(1); break;
          case 'ArrowDown': move(2); break;
          case 'ArrowLeft': move(3); break;
          default: break;
        }
      }
    },
    [move]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    initGame();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, initGame]);

  const handleReset = useCallback(() => initGame(), [initGame]);
  const goToLeaderboard = useCallback(() => { setShowDropdown(false); navigate('/leaderboard'); }, [navigate]);
  const logout = () => { localStorage.removeItem('token'); setAppUser(null); navigate('/login', { replace: true }); };

  // --- render functions and return remain unchanged ---
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
            <img src={avatarUrl} alt="Avatar" />
            <span>{user.displayName || user.username}</span>
          </div>
          <div className="dashboard-topbar-right">
            <button ref={buttonRef} onClick={() => setShowDropdown(!showDropdown)}>☰</button>
            {showDropdown && (
              <div className="dashboard-dropdown" ref={dropdownRef}>
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
