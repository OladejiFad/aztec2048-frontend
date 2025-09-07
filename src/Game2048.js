import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef, useCallback } from 'react';
import './Game2048.css';

const SIZE = 4;

const Game2048 = forwardRef(({ onScoreChange, onGameOver }, ref) => {
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(generateEmptyBoard());
  const [gameOver, setGameOver] = useState(false);
  const mergedCellsRef = useRef([]);
  const newTilesRef = useRef([]);
  const boardRef = useRef(null);

  useImperativeHandle(ref, () => ({
    resetGame() {
      const newBoard = addRandomTile(addRandomTile(generateEmptyBoard()), newTilesRef);
      setBoard(newBoard);
      setScore(0);
      setGameOver(false);
      mergedCellsRef.current = [];
      newTilesRef.current = [];
      if (onScoreChange) onScoreChange(0);
    },
  }));

  useEffect(() => {
    const newBoard = addRandomTile(addRandomTile(generateEmptyBoard()), newTilesRef);
    setBoard(newBoard);
  }, []);

  useEffect(() => {
    if (onScoreChange) onScoreChange(score);
  }, [score, onScoreChange]);

  // --- Board manipulation ---
  const slide = useCallback((row, rowIndex) => {
    const arr = row.filter(v => v !== null);
    const mergedPositions = [];

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        setScore(prev => prev + arr[i]);
        arr[i + 1] = null;
        mergedPositions.push([rowIndex, i]);
      }
    }

    mergedCellsRef.current[rowIndex] = mergedPositions.map(pos => pos[1]);
    return arr.filter(v => v !== null);
  }, []);

  const moveLeft = useCallback((b) => b.map((row, i) => {
    const s = slide(row, i);
    while (s.length < SIZE) s.push(null);
    return s;
  }), [slide]);

  const moveRight = useCallback((b) => b.map((row, i) => {
    const s = slide(row.slice().reverse(), i);
    while (s.length < SIZE) s.push(null);
    return s.reverse();
  }), [slide]);

  const transpose = useCallback((b) => b[0].map((_, i) => b.map(row => row[i])), []);
  const moveUp = useCallback((b) => transpose(moveLeft(transpose(b))), [transpose, moveLeft]);
  const moveDown = useCallback((b) => transpose(moveRight(transpose(b))), [transpose, moveRight]);

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

  // --- Handle move ---
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
      const newBoardWithTile = addRandomTile(newBoard, newTilesRef);
      setBoard(newBoardWithTile);

      if (checkGameOver(newBoardWithTile)) {
        setGameOver(true);
        if (onGameOver) onGameOver(score);
      }
    }
  }, [board, gameOver, score, moveUp, moveDown, moveLeft, moveRight, boardsEqual, checkGameOver, onGameOver]);

  // --- Keyboard ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        switch (e.key) {
          case 'ArrowUp': handleMove('up'); break;
          case 'ArrowDown': handleMove('down'); break;
          case 'ArrowLeft': handleMove('left'); break;
          case 'ArrowRight': handleMove('right'); break;
          default: break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  // --- Touch ---
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const threshold = window.innerWidth < 360 ? 10 : 20; // smaller threshold for tiny screens

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        dx > 0 ? handleMove('right') : handleMove('left');
      } else if (Math.abs(dy) > threshold) {
        dy > 0 ? handleMove('down') : handleMove('up');
      }
    };

    const boardEl = boardRef.current;
    if (!boardEl) return;

    boardEl.style.touchAction = 'none';
    boardEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    boardEl.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      boardEl.removeEventListener('touchstart', handleTouchStart);
      boardEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMove]);

  function generateEmptyBoard() {
    return Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
  }

  function addRandomTile(b, newTilesRef) {
    const empty = [];
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++)
        if (!b[i][j]) empty.push([i, j]);
    if (!empty.length) return b;

    const [x, y] = empty[Math.floor(Math.random() * empty.length)];
    const newBoard = b.map(row => row.slice());
    newBoard[x][y] = Math.random() < 0.9 ? 2 : 4;
    newTilesRef.current = [[x, y]]; // store new tile for animation
    return newBoard;
  }

  return (
    <div className="game-2048-container">
      <h3>Score: {score}</h3>

      <div className="board" ref={boardRef}>
        {board.flatMap((row, i) =>
          row.map((cell, j) => (
            <div
              key={`${i}-${j}`}
              className={`board-cell tile-${cell || 0} ${mergedCellsRef.current[i]?.includes(j) ? 'merged' : ''
                } ${newTilesRef.current.some(([x, y]) => x === i && y === j) ? 'new-tile' : ''
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
