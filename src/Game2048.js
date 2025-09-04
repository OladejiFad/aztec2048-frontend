import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import './Game2048.css';

const GRID_SIZE = 4;

// --- Grid helpers ---
const createEmptyGrid = () => Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
const transpose = (grid) => grid[0].map((_, i) => grid.map(row => row[i]));
const getRandomEmptyCell = (grid) => {
  const empty = [];
  grid.forEach((row, i) => row.forEach((cell, j) => { if (cell === 0) empty.push([i, j]); }));
  if (!empty.length) return null;
  return empty[Math.floor(Math.random() * empty.length)];
};
const addRandomTile = (grid) => {
  const pos = getRandomEmptyCell(grid);
  if (!pos) return { grid, newTile: null };
  const newGrid = grid.map(row => [...row]);
  newGrid[pos[0]][pos[1]] = Math.random() < 0.9 ? 2 : 4;
  return { grid: newGrid, newTile: pos };
};
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

// --- Tile colors ---
const TILE_COLORS = {
  2: '#fcefe6',
  4: '#f2e8cb',
  8: '#f5b682',
  16: '#f29446',
  32: '#f27c5f',
  64: '#f55d37',
  128: '#ebcf74',
  256: '#ebcc62',
  512: '#e3c542',
  1024: '#e0b02e',
  2048: '#e0a21c',
};

const Game2048 = forwardRef(({ onScoreChange, userId, backendUrl }, ref) => {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [currentScore, setCurrentScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [newTilePos, setNewTilePos] = useState(null);
  const [mergedTiles, setMergedTiles] = useState([]);

  const initGame = useCallback(() => {
    let result = addRandomTile(createEmptyGrid());
    result = addRandomTile(result.grid);
    setGrid(result.grid);
    setCurrentScore(0);
    setGameOver(false);
    setNewTilePos(result.newTile);
    setMergedTiles([]);
  }, []);

  useImperativeHandle(ref, () => ({ resetGame: initGame }));

  const handleMove = useCallback((key) => {
    setGrid(prevGrid => {
      if (gameOver) return prevGrid;

      let moved = false;
      let newGrid = prevGrid.map(r => [...r]);
      let points = 0;
      let mergedPositions = [];

      const processRow = (row, rowIdx, reverse = false) => {
        const input = reverse ? [...row].reverse() : row;
        const newRow = [];
        let skip = false;
        for (let i = 0; i < input.length; i++) {
          if (skip) { skip = false; continue; }
          if (input[i] !== 0 && input[i] === input[i + 1]) {
            const merged = input[i] * 2;
            newRow.push(merged);
            points += merged;
            const colIdx = reverse ? row.length - 1 - i : i;
            mergedPositions.push([rowIdx, colIdx]);
            skip = true;
          } else newRow.push(input[i]);
        }
        while (newRow.length < GRID_SIZE) newRow.push(0);
        return reverse ? newRow.reverse() : newRow;
      };

      switch (key) {
        case 'ArrowLeft':
          newGrid = newGrid.map((row, idx) => processRow(row, idx));
          break;
        case 'ArrowRight':
          newGrid = newGrid.map((row, idx) => processRow(row, idx, true));
          break;
        case 'ArrowUp':
          newGrid = transpose(newGrid).map((row, idx) => processRow(row, idx));
          newGrid = transpose(newGrid);
          break;
        case 'ArrowDown':
          newGrid = transpose(newGrid).map((row, idx) => processRow(row, idx, true));
          newGrid = transpose(newGrid);
          break;
        default: return prevGrid;
      }

      if (JSON.stringify(newGrid) !== JSON.stringify(prevGrid)) moved = true;

      if (moved) {
        const result = addRandomTile(newGrid);
        const newScore = currentScore + points;
        setCurrentScore(newScore);
        if (onScoreChange) onScoreChange(newScore);

        if (userId && backendUrl) {
          fetch(`${backendUrl}/auth/api/update-score/${userId}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: newScore }),
          }).catch(err => console.error(err));
        }

        if (!hasMovesLeft(result.grid)) setGameOver(true);

        setNewTilePos(result.newTile);
        setMergedTiles(mergedPositions);

        return result.grid;
      }

      return prevGrid;
    });
  }, [gameOver, currentScore, onScoreChange, userId, backendUrl]);

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

    initGame();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMove, initGame]);

  return (
    <div className="game-container">
      <h3>Score: {currentScore}</h3>
      <div className="grid">
        {grid.flat().map((cell, idx) => {
          const row = Math.floor(idx / GRID_SIZE);
          const col = idx % GRID_SIZE;
          const isNew = newTilePos && newTilePos[0] === row && newTilePos[1] === col;
          const isMerged = mergedTiles.some(([r, c]) => r === row && c === col);

          return (
            <div
              key={idx}
              className={`cell ${cell ? `cell-${cell}` : ''} ${isNew ? 'new-tile' : ''} ${isMerged ? 'merged-tile' : ''}`}
              style={{ background: cell ? TILE_COLORS[cell] || '#eee' : '#f0f0f0' }}
            >
              {cell ? <span className="cell-number">{cell}</span> : null}
            </div>
          );
        })}
      </div>

      {gameOver && (
        <div className="game-over">
          <h2>Game Over</h2>
          <button onClick={initGame}>Play Again</button>
        </div>
      )}
    </div>
  );
});

export default Game2048;
