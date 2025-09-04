import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import './Game2048.css';

const SIZE = 4;

const Game2048 = forwardRef(({ onScoreChange, onGameOver }, ref) => {
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(generateEmptyBoard());

  useImperativeHandle(ref, () => ({
    resetGame() {
      setScore(0);
      setBoard(addRandomTile(generateEmptyBoard()));
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

  function generateEmptyBoard() {
    return Array(SIZE).fill().map(() => Array(SIZE).fill(null));
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

  function moveLeft(b) {
    return b.map(row => {
      const s = slide(row);
      while (s.length < SIZE) s.push(null);
      return s;
    });
  }

  function moveRight(b) {
    return b.map(row => {
      const s = slide(row.reverse());
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
    let newBoard;
    switch (direction) {
      case 'up': newBoard = moveUp(board); break;
      case 'down': newBoard = moveDown(board); break;
      case 'left': newBoard = moveLeft(board); break;
      case 'right': newBoard = moveRight(board); break;
      default: return;
    }

    if (!boardsEqual(board, newBoard)) {
      const withNewTile = addRandomTile(newBoard);
      setBoard(withNewTile);
      if (checkGameOver(withNewTile) && onGameOver) onGameOver(score);
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

  return (
    <div className="game-2048-container">
      <h3>Score: {score}</h3>
      <div className="board">
        {board.map((row, i) => (
          <div key={i} className="board-row">
            {row.map((cell, j) => (
              <div key={j} className={`board-cell tile-${cell || 0}`}>
                {cell || ''}
                {cell && <span className="tile-label">Aztec</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="controls">
        <button onClick={() => handleMove('up')}>Up</button>
        <button onClick={() => handleMove('down')}>Down</button>
        <button onClick={() => handleMove('left')}>Left</button>
        <button onClick={() => handleMove('right')}>Right</button>
      </div>
    </div>
  );
});

export default Game2048;
