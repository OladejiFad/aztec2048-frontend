import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import './Game2048.css';

const Game2048 = forwardRef(({ userId, backendUrl, onScoreChange, onGameOver }, ref) => {
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(generateEmptyBoard());

  // Expose resetGame to parent via ref
  useImperativeHandle(ref, () => ({
    resetGame() {
      setScore(0);
      setBoard(generateEmptyBoard());
    },
  }));

  useEffect(() => {
    if (onScoreChange) onScoreChange(score);
  }, [score, onScoreChange]);

  // --- Game logic ---
  function generateEmptyBoard() {
    return Array(4)
      .fill()
      .map(() => Array(4).fill(null));
  }

  const handleMove = (direction) => {
    // Simplified: implement your merging/movement logic here
    const newScore = score + Math.floor(Math.random() * 1000); // demo score increment
    setScore(newScore);

    // If game over condition met (for demo: random)
    if (Math.random() < 0.1) {
      if (onGameOver) onGameOver(newScore);
    }
  };

  return (
    <div className="game-2048-container">
      <h3>Score: {score}</h3>
      <div className="board">
        {board.map((row, i) => (
          <div key={i} className="board-row">
            {row.map((cell, j) => (
              <div key={j} className="board-cell">{cell || ''}</div>
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
