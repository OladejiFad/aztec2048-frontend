import React, { useState, useEffect, useCallback } from 'react';
import './Game2048.css';

const GRID_SIZE = 4;

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

const Game2048 = () => {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const initGame = useCallback(() => {
    let result = addRandomTile(createEmptyGrid());
    result = addRandomTile(result.grid);
    setGrid(result.grid);
    setScore(0);
    setGameOver(false);
  }, []);

  const handleMove = useCallback((key) => {
    setGrid(prevGrid => {
      if (gameOver) return prevGrid;

      let moved = false;
      let newGrid = prevGrid.map(r => [...r]);
      let points = 0;

      const processRow = (row, reverse = false) => {
        const input = reverse ? [...row].reverse() : row;
        const newRow = [];
        let skip = false;
        for (let i = 0; i < input.length; i++) {
          if (skip) { skip = false; continue; }
          if (input[i] !== 0 && input[i] === input[i + 1]) {
            const merged = input[i] * 2;
            newRow.push(merged);
            points += merged;
            skip = true;
          } else newRow.push(input[i]);
        }
        while (newRow.length < GRID_SIZE) newRow.push(0);
        return reverse ? newRow.reverse() : newRow;
      };

      switch (key) {
        case 'ArrowLeft':
          newGrid = newGrid.map(row => processRow(row));
          break;
        case 'ArrowRight':
          newGrid = newGrid.map(row => processRow(row, true));
          break;
        case 'ArrowUp':
          newGrid = transpose(newGrid).map(row => processRow(row));
          newGrid = transpose(newGrid);
          break;
        case 'ArrowDown':
          newGrid = transpose(newGrid).map(row => processRow(row, true));
          newGrid = transpose(newGrid);
          break;
        default: return prevGrid;
      }

      if (JSON.stringify(newGrid) !== JSON.stringify(prevGrid)) moved = true;

      if (moved) {
        const result = addRandomTile(newGrid);
        setScore(prev => prev + points);
        if (!hasMovesLeft(result.grid)) setGameOver(true);
        return result.grid;
      }

      return prevGrid;
    });
  }, [gameOver]);

  useEffect(() => {
    const handleKeyDown = e => handleMove(e.key);
    window.addEventListener('keydown', handleKeyDown);
    initGame();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, initGame]);

  return (
    <div className="game-container">
      <h3>Score: {score}</h3>
      <div className="grid">
        {grid.flat().map((cell, idx) => (
          <div
            key={idx}
            className={`cell ${cell ? `cell-${cell}` : ''}`}
            style={{ background: cell ? TILE_COLORS[cell] || '#eee' : '#f0f0f0' }}
          >
            {cell ? <span className="cell-number">{cell}</span> : null}
          </div>
        ))}
      </div>
      {gameOver && (
        <div className="game-over">
          <h2>Game Over</h2>
          <button onClick={initGame}>Play Again</button>
        </div>
      )}
    </div>
  );
};

export default Game2048;
