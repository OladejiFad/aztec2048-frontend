import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef, useCallback } from 'react';
import './Game2048.css';

const SIZE = 4;

const Game2048 = forwardRef(({ onScoreChange, onGameOver }, ref) => {
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(generateEmptyBoard());
  const [gameOver, setGameOver] = useState(false);
  const boardRef = useRef(null);

  // ✅ ref for touch start positions
  const touchStartRef = useRef({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    resetGame() {
      setScore(0);
      setBoard(addRandomTile(addRandomTile(generateEmptyBoard())));
      setGameOver(false);
    },
  }));


  useEffect(() => {
    setBoard(addRandomTile(addRandomTile(generateEmptyBoard())));
  }, []);

  useEffect(() => {
    if (onScoreChange) onScoreChange(score);
  }, [score, onScoreChange]);

  // ✅ auto-refresh when user wins
  useEffect(() => {
    if (gameOver) {
      const finalScore = score; // capture final score

      const timer = setTimeout(() => {
        // ✅ notify Dashboard so it updates gamesLeft + totalScore
        if (onGameOver) onGameOver(finalScore);

        // ✅ then reset locally
        setScore(0);
        setBoard(addRandomTile(addRandomTile(generateEmptyBoard())));
        setGameOver(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [gameOver, score, onGameOver]);




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
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        setScore(prev => prev + arr[i]);
        arr[i + 1] = null;
      }
    }
    return arr.filter(v => v !== null);
  }

  const moveLeft = useCallback((b) => {
    return b.map(row => {
      const s = slide(row);
      while (s.length < SIZE) s.push(null);
      return s;
    });
  }, []);

  const moveRight = useCallback((b) => {
    return b.map(row => {
      const s = slide(row.slice().reverse());
      while (s.length < SIZE) s.push(null);
      return s.reverse();
    });
  }, []);

  const transpose = useCallback((b) => b[0].map((_, i) => b.map(row => row[i])), []);
  const moveUp = useCallback((b) => transpose(moveLeft(transpose(b))), [moveLeft, transpose]);
  const moveDown = useCallback((b) => transpose(moveRight(transpose(b))), [moveRight, transpose]);

  const boardsEqual = useCallback((a, b) => {
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++)
        if (a[i][j] !== b[i][j]) return false;
    return true;
  }, []);

  const checkGameOver = useCallback((b) => {
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
  }, []);

  const handleMove = useCallback((direction) => {
    if (gameOver) return;

    let newBoard;
    switch (direction) {
      case 'up': newBoard = moveUp(board); break;
      case 'down': newBoard = moveDown(board); break;
      case 'left': newBoard = moveLeft(board); break;
      case 'right': newBoard = moveRight(board); break;
      default: return;
    }

    if (!boardsEqual(board, newBoard)) {
      const updatedBoard = addRandomTile(newBoard);
      setBoard(updatedBoard);
      if (score >= 30000 || checkGameOver(updatedBoard)) {
        setGameOver(true);
        if (onGameOver) onGameOver(score);
      }
    }
  }, [board, gameOver, score, moveUp, moveDown, moveLeft, moveRight, boardsEqual, checkGameOver, onGameOver]);

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
  }, [handleMove]);

  // ✅ Updated touch handling
  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      const threshold = 20;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        dx > 0 ? handleMove('right') : handleMove('left');
      } else if (Math.abs(dy) > threshold) {
        dy > 0 ? handleMove('down') : handleMove('up');
      }
    };

    const boardEl = boardRef.current;
    boardEl?.addEventListener('touchstart', handleTouchStart, { passive: false });
    boardEl?.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      boardEl?.removeEventListener('touchstart', handleTouchStart);
      boardEl?.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMove]);

  function getScoreClass(b) {
    const maxTile = Math.max(...b.flat().filter(Boolean));
    if (maxTile >= 2048) return "score-gold";
    if (maxTile >= 512) return "score-purple";
    if (maxTile >= 128) return "score-green";
    return "score-default";
  }

  return (
    <div className="game-2048-container">
      <div className={`score ${getScoreClass(board)}`}>Score: {score}</div>

      {/* ✅ Hide board when game is over */}
      {!gameOver && (
        <div className="game-board" ref={boardRef}>
          {board.flatMap((row, i) =>
            row.map((cell, j) => (
              <div
                key={`${i}-${j}`}
                className={`board-cell ${cell ? `tile-${cell}` : ''}`}
              >
                {cell || ''}
              </div>
            ))
          )}
        </div>
      )}

      {gameOver && (
        <div className="game-over-overlay">
          {score >= 30000 ? (
            <>
              <h2>🎉 Congratulations! 🎉</h2>
              <h4>You won Aztec Test, You are one of us!</h4>
              <p>You reached {score} points!</p>
            </>
          ) : (
            <h2>Game Over</h2>
          )}
        </div>
      )}
    </div>
  );

});

export default Game2048;
