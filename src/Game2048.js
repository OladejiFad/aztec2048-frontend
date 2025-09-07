import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import "./Game2048.css";

const SIZE = 4;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// === Pure Helper Functions ===
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
  const newBoard = b.map((row) =>
    row.map((cell) => (cell ? { value: cell, prevPos: [x, y] } : null))
  );

  newBoard[x][y] = Math.random() < 0.9 ? 2 : 4;
  newBoard.newTile = [x, y]; // mark new tile
  return newBoard;
}

function slide(row, onMerge) {
  const arr = row.filter((v) => v !== null);

  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      if (onMerge) onMerge(arr[i]);
      arr[i + 1] = null;
    }
  }
  return arr.filter((v) => v !== null);
}

function moveLeft(b, onMerge) {
  return b.map((row) => {
    const s = slide(row, onMerge);
    while (s.length < SIZE) s.push(null);
    return s;
  });
}

function moveRight(b, onMerge) {
  return b.map((row) => {
    const s = slide(row.slice().reverse(), onMerge);
    while (s.length < SIZE) s.push(null);
    return s.reverse();
  });
}

function transpose(b) {
  return b[0].map((_, i) => b.map((row) => row[i]));
}

function moveUp(b, onMerge) {
  return transpose(moveLeft(transpose(b), onMerge));
}

function moveDown(b, onMerge) {
  return transpose(moveRight(transpose(b), onMerge));
}

function boardsEqual(a, b) {
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE; j++)
      if (a[i][j] !== b[i][j]) return false;
  return true;
}

// === React Component ===
const Game2048 = forwardRef(({ onScoreChange, onGameOver }, ref) => {
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(generateEmptyBoard());
  const [gameOver, setGameOver] = useState(false);
  const boardRef = useRef(null);

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

  const handleMove = useCallback(
    (direction) => {
      if (gameOver) return;
      const addScore = (val) => setScore((prev) => prev + val);
      let newBoard = [];
      switch (direction) {
        case "up": newBoard = moveUp(board, addScore); break;
        case "down": newBoard = moveDown(board, addScore); break;
        case "left": newBoard = moveLeft(board, addScore); break;
        case "right": newBoard = moveRight(board, addScore); break;
        default: return;
      }

      if (!boardsEqual(board, newBoard)) {
        const boardWithTile = addRandomTile(newBoard);
        setBoard(boardWithTile);

        if (checkGameOver(boardWithTile)) {
          setGameOver(true);
          sendScore(score);
          if (onGameOver) onGameOver(score);
        }
      }
    },
    [board, gameOver, score, onGameOver]
  );

  function checkGameOver(b) {
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE; j++) if (!b[i][j]) return false;

    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE - 1; j++) if (b[i][j] === b[i][j + 1]) return false;

    for (let j = 0; j < SIZE; j++)
      for (let i = 0; i < SIZE - 1; i++) if (b[i][j] === b[i + 1][j]) return false;

    return true;
  }

  async function sendScore(finalScore) {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await fetch(`${BACKEND_URL}/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score: finalScore }),
      });
    } catch (err) {
      console.error("Failed to send score:", err);
    }
  }

  // --- Keyboard handler ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowUp": handleMove("up"); break;
        case "ArrowDown": handleMove("down"); break;
        case "ArrowLeft": handleMove("left"); break;
        case "ArrowRight": handleMove("right"); break;
        default: break; // <- satisfies "expected default case"
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMove]);


  useEffect(() => {
    let startX = 0, startY = 0;
    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const threshold = 20;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold)
        dx > 0 ? handleMove("right") : handleMove("left");
      else if (Math.abs(dy) > threshold)
        dy > 0 ? handleMove("down") : handleMove("up");
    };

    const boardEl = boardRef.current;
    boardEl?.addEventListener("touchstart", handleTouchStart);
    boardEl?.addEventListener("touchend", handleTouchEnd);
    return () => {
      boardEl?.removeEventListener("touchstart", handleTouchStart);
      boardEl?.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleMove]);

  return (
    <div className="game-2048-container">
      <div className="game-topbar">
        <h3>Score: {score}</h3>
        <button onClick={() => ref.current.resetGame()}>Restart</button>
      </div>
      <div className="board" ref={boardRef}>
        {/* --- Tile rendering --- */}
        {board.flatMap((row, i) =>
          row.map((cell, j) => {
            if (!cell) return null;

            const isNew = board.newTile?.[0] === i && board.newTile?.[1] === j;

            return (
              <div
                key={`${i}-${j}-${cell.value ?? cell}`}
                className={`tile tile-${cell.value ?? cell} ${isNew ? "tile-new" : ""}`}
                style={{
                  transform: `translate(${j * 100}%, ${i * 100}%)`,
                }}
              >
                {cell.value ?? cell}
                <span className="tile-label">Aztec</span>
              </div>
            );
          })
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
