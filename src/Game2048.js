import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import './Game2048.css';

const GRID_SIZE = 4;

const numberToLetter = {
  2: '2', 4: '4', 8: '8', 16: '16',
  32: '32', 64: '64', 128: '128',
  256: '256', 512: '512', 1024: '1024', 2048: '2048'
};

const createEmptyGrid = () =>
  Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));

const getRandomEmptyCell = (grid) => {
  const empty = [];
  grid.forEach((row, i) =>
    row.forEach((cell, j) => { if (cell === 0) empty.push([i, j]); })
  );
  if (empty.length === 0) return null;
  return empty[Math.floor(Math.random() * empty.length)];
};

const addRandomTile = (grid) => {
  const pos = getRandomEmptyCell(grid);
  if (!pos) return { grid, newTile: null };
  const newGrid = grid.map(row => [...row]);
  newGrid[pos[0]][pos[1]] = Math.random() < 0.9 ? 2 : 4;
  return { grid: newGrid, newTile: pos };
};

const slideAndMerge = (row) => {
  const nonZero = row.filter(num => num !== 0);
  const newRow = [];
  let skip = false;
  let points = 0;

  for (let i = 0; i < nonZero.length; i++) {
    if (skip) { skip = false; continue; }
    if (nonZero[i] === nonZero[i + 1]) {
      const merged = nonZero[i] * 2;
      newRow.push(merged);
      points += merged;
      skip = true;
    } else {
      newRow.push(nonZero[i]);
    }
  }

  while (newRow.length < GRID_SIZE) newRow.push(0);
  return { newRow, points };
};

const transpose = (grid) => grid[0].map((_, i) => grid.map(row => row[i]));

const hasMovesLeft = (grid) => {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] === 0) return true;
      if (i < GRID_SIZE - 1 && grid[i][j] === grid[i + 1][j]) return true;
      if (j < GRID_SIZE - 1 && grid[i][j] === grid[i][j + 1]) return true;
    }
  }
  return false;
};

const Game2048 = forwardRef(({ onScoreChange, onGameOver, userId, backendUrl }, ref) => {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [newTilePos, setNewTilePos] = useState(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const initGame = useCallback(() => {
    let freshGrid = createEmptyGrid();
    let result = addRandomTile(freshGrid);
    result = addRandomTile(result.grid);
    setGrid(result.grid);
    setNewTilePos(null);
    setCurrentScore(0);
    setGameOver(false);
  }, []);

  useImperativeHandle(ref, () => ({
    resetGame: () => initGame()
  }));

  const handleMove = useCallback((key) => {
    if (gameOver) return;
    let moved = false;
    let newGrid = grid.map(row => [...row]);
    let points = 0;

    const processRow = (row, reverse = false) => {
      const input = reverse ? [...row].reverse() : row;
      const { newRow, points: rowPoints } = slideAndMerge(input);
      points += rowPoints;
      return reverse ? newRow.reverse() : newRow;
    };

    switch (key) {
      case 'ArrowLeft':
        newGrid = newGrid.map(row => {
          const merged = processRow(row);
          if (JSON.stringify(merged) !== JSON.stringify(row)) moved = true;
          return merged;
        });
        break;
      case 'ArrowRight':
        newGrid = newGrid.map(row => {
          const merged = processRow(row, true);
          if (JSON.stringify(merged) !== JSON.stringify(row)) moved = true;
          return merged;
        });
        break;
      case 'ArrowUp':
        newGrid = transpose(newGrid);
        newGrid = newGrid.map(row => {
          const merged = processRow(row);
          if (JSON.stringify(merged) !== JSON.stringify(row)) moved = true;
          return merged;
        });
        newGrid = transpose(newGrid);
        break;
      case 'ArrowDown':
        newGrid = transpose(newGrid);
        newGrid = newGrid.map(row => {
          const merged = processRow(row, true);
          if (JSON.stringify(merged) !== JSON.stringify(row)) moved = true;
          return merged;
        });
        newGrid = transpose(newGrid);
        break;
      default: return;
    }

    if (moved) {
      const result = addRandomTile(newGrid);
      setGrid(result.grid);
      setNewTilePos(result.newTile);

      const newScore = currentScore + points;
      setCurrentScore(newScore);
      if (onScoreChange) onScoreChange(newScore);

      if (!hasMovesLeft(result.grid)) {
        setGameOver(true);
        if (onGameOver && userId && backendUrl) {
          fetch(`${backendUrl}/auth/api/update-score/${userId}`, {
            method: 'POST',
            credentials: 'include', // session cookie
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: newScore }),
          })
            .then(res => res.json())
            .then(data => {
              if (onGameOver) onGameOver(data.totalScore ?? newScore);
            })
            .catch(err => console.error('[ERROR] Updating score:', err));
        }
      }
    }
  }, [grid, gameOver, currentScore, onScoreChange, onGameOver, userId, backendUrl]);

  useEffect(() => {
    const handleKeyDown = e => handleMove(e.key);
    window.addEventListener('keydown', handleKeyDown);

    let startX = 0, startY = 0;
    const handleTouchStart = e => { const t = e.touches[0]; startX = t.clientX; startY = t.clientY; };
    const handleTouchEnd = e => {
      const t = e.changedTouches[0];
      const diffX = t.clientX - startX;
      const diffY = t.clientY - startY;
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 30) handleMove('ArrowRight');
        else if (diffX < -30) handleMove('ArrowLeft');
      } else {
        if (diffY > 30) handleMove('ArrowDown');
        else if (diffY < -30) handleMove('ArrowUp');
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMove]);

  useEffect(() => { initGame(); }, [initGame]);

  return (
    <div className="game-container">
      <h3>Current Score: {currentScore}</h3>
      <div className="grid">
        {grid.flat().map((cell, idx) => {
          const row = Math.floor(idx / GRID_SIZE);
          const col = idx % GRID_SIZE;
          return (
            <div
              key={idx}
              className={`cell ${cell !== 0 ? `cell-${cell}` : ''} ${newTilePos && newTilePos[0] === row && newTilePos[1] === col ? 'new-tile' : ''}`}
            >
              {cell !== 0 ? numberToLetter[cell] || cell : ''}
            </div>
          );
        })}
      </div>

      {gameOver && (
        <div className="game-over">
          <h2>Game Over!</h2>
          <p>Your final score: {currentScore}</p>
          <p>Use the Reset Game button on the sidebar to play again.</p>
        </div>
      )}
    </div>
  );
});

export default Game2048;
