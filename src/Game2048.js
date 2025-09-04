import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import './Game2048.css';

const SIZE = 4;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Game2048 = forwardRef(({ onScoreChange }, ref) => {
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(generateEmptyBoard());
  const [gameOver, setGameOver] = useState(false);
  const mergedCellsRef = useRef([]);

  useImperativeHandle(ref, () => ({
    resetGame() {
      setScore(0);
      setBoard(addRandomTile(addRandomTile(generateEmptyBoard())));
      setGameOver(false);
      mergedCellsRef.current = [];
    },
  }));

  useEffect(() => {
    setBoard(addRandomTile(addRandomTile(generateEmptyBoard())));
  }, []);

  useEffect(() => {
    if (onScoreChange) onScoreChange(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp': handleMove('up'); break;
        case 'ArrowDown': handleMove('down'); break;
        case 'ArrowLeft': handleMove('left'); break;
        case 'ArrowRight': handleMove('right'); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board]);

  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) handleMove('right');
        else if (dx < -30) handleMove('left');
      } else {
        if (dy > 30) handleMove('down');
        else if (dy < -30) handleMove('up');
      }
    };

    const boardEl = document.querySelector('.board');
    boardEl?.addEventListener('touchstart', handleTouchStart);
    boardEl?.addEventListener('touchend', handleTouchEnd);

    return () => {
      boardEl?.removeEventListener('touchstart', handleTouchStart);
      boardEl?.removeEventListener('touchend', handleTouchEnd);
    };
  }, [board]);

  function generateEmptyBoard() {
    return Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
  }

  function addRandomTile(b) {
    const empty = [];
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++)
        if (!b[i][j]) empty.push([i, j]);

    if (!empty.length) return b;

    const [x, y] = empty[Math.floor(Math.random() * empty.length)];
    const newBoard = b.map(row => row.slice());
    newBoard[x][y] = Math.random() < 0.9 ? 2 : 4;
    return newBoard;
  }

  function slide(row) {
    const arr = row.filter(v => v !== null);
    mergedCellsRef.current = [];

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        setScore(prev => prev + arr[i]);
        arr[i + 1] = null;
        mergedCellsRef.current.push([i]);
      }
    }
    return arr.filter(v => v !== null);
  }

  function moveLeft(b) {
    return b.map(row => {
      const s = slide(row);
      while (s.length < SIZE) s.push(null);
      return s;
    });
  }

  function moveRight(b) {
    return b.map(row => {
      const s = slide(row.slice().reverse());
      while (s.length < SIZE) s.push(null);
      return s.reverse();
    });
  }

  function transpose(b) {
    return b[0].map((_, i) => b.map(row => row[i]));
  }

  function moveUp(b) {
    return transpose(moveLeft(transpose(b)));
  }

  function moveDown(b) {
    return transpose(moveRight(transpose(b)));
  }

  function boardsEqual(a, b) {
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++)
        if (a[i][j] !== b[i][j]) return false;
    return true;
  }

  function handleMove(direction) {
    if (gameOver) return;

    let newBoard = [];
    switch (direction) {
      case 'up': newBoard = moveUp(board); break;
      case 'down': newBoard = moveDown(board); break;
      case 'left': newBoard = moveLeft(board); break;
      case 'right': newBoard = moveRight(board); break;
      default: return;
    }

    if (!boardsEqual(board, newBoard)) {
      setBoard(addRandomTile(newBoard));
      if (checkGameOver(newBoard)) {
        setGameOver(true);
        sendScore(score);
      }
    }
  }

  function checkGameOver(b) {
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++)
        if (!b[i][j]) return false;

    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE - 1; j++)
        if (b[i][j] === b[i][j + 1]) return false;

    for (let j = 0; j < SIZE; j++)
      for (let i = 0; i < SIZE - 1; i++)
        if (b[i][j] === b[i + 1][j]) return false;

    return true;
  }

  async function sendScore(finalScore) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(`${BACKEND_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ score: finalScore })
      });
    } catch (err) {
      console.error('Failed to send score:', err);
    }
  }

  return (
    <div className="game-2048-container">
      <h3>Score: {score}</h3>

      <div className="board">
        {board.flatMap((row, i) =>
          row.map((cell, j) => (
            <div
              key={`${i}-${j}`}
              className={`board-cell tile-${cell || 0} ${mergedCellsRef.current.some(([idx]) => idx === j) ? 'merged' : ''
                }`}
            >
              {cell || ''}
              {cell && <span className="tile-label">Aztec</span>}
            </div>
          ))
        )}
      </div>

      {gameOver && (
        <div className="game-over-overlay">
          <h2>Game Over</h2>
          <button onClick={() => ref.current.resetGame()}>Restart</button>
        </div>
      )}
    </div>
  );
});

export default Game2048;
