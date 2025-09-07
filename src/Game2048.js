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

// --- Helper Functions ---
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
    row.map((cell) => (cell ? { value: cell.value ?? cell } : null))
  );

  newBoard[x][y] = Math.random() < 0.9 ? { value: 2 } : { value: 4 };
  newBoard.newTile = [x, y];
  return newBoard;
}

function slide(row, onMerge) {
  const arr = row.filter((v) => v !== null);

  for (let i = 0; i < arr.length - 1; i++) {
    const val1 = arr[i].value ?? arr[i];
    const val2 = arr[i + 1].value ?? arr[i + 1];
    if (val1 === val2) {
      const newVal = val1 * 2;
      arr[i] = { value: newVal };
      if (onMerge) onMerge(newVal);
      arr[i + 1] = null;
    } else {
      arr[i] = { value: val1 };
    }
  }

  if (arr.length && typeof arr[arr.length - 1] !== "object") {
    arr[arr.length - 1] = { value: arr[arr.length - 1] };
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
    for (let j = 0; j < SIZE; j++) {
      const valA = a[i][j]?.value ?? a[i][j];
      const valB = b[i][j]?.value ?? b[i][j];
      if (valA !== valB) return false;
    }
  return true;
}

function checkGameOver(b) {
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE; j++) if (!b[i][j]) return false;

  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE - 1; j++)
      if ((b[i][j]?.value ?? b[i][j]) === (b[i][j + 1]?.value ?? b[i][j + 1]))
        return false;

  for (let j = 0; j < SIZE; j++)
    for (let i = 0; i < SIZE - 1; i++)
      if ((b[i][j]?.value ?? b[i][j]) === (b[i + 1][j]?.value ?? b[i + 1][j]))
        return false;

  return true;
}

// --- Game Component ---
const Game2048 = forwardRef(({ onScoreChange, onGameOver }, ref) => {
  const [board, setBoard] = useState(generateEmptyBoard());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const boardRef = useRef();

  // Expose resetGame to parent
  useImperativeHandle(ref, () => ({
    resetGame() {
      const newBoard = addRandomTile(addRandomTile(generateEmptyBoard()));
      setBoard(newBoard);
      setScore(0);
      setGameOver(false);
    },
  }));

  // Initialize board
  useEffect(() => {
    const newBoard = addRandomTile(addRandomTile(generateEmptyBoard()));
    setBoard(newBoard);
  }, []);

  // Notify score change
  useEffect(() => {
    if (onScoreChange) onScoreChange(score);
  }, [score, onScoreChange]);

  const handleMove = useCallback(
    (direction) => {
      if (gameOver) return;

      let scoreIncrement = 0;
      const addScore = (val) => (scoreIncrement += val);

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
        setScore((prev) => prev + scoreIncrement);

        if (checkGameOver(boardWithTile)) {
          setGameOver(true);
          if (onGameOver) onGameOver(score + scoreIncrement);
          sendScore(score + scoreIncrement);
        }
      }
    },
    [board, gameOver, score, onGameOver]
  );

  async function sendScore(finalScore) {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await fetch(`${BACKEND_URL}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score: finalScore }),
      });
    } catch (err) {
      console.error("Failed to send score:", err);
    }
  }

  // --- Keyboard & Touch ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowUp": handleMove("up"); break;
        case "ArrowDown": handleMove("down"); break;
        case "ArrowLeft": handleMove("left"); break;
        case "ArrowRight": handleMove("right"); break;
        default: break;
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

  // --- Render ---
  return (
    <div className="game-2048-container">
      <div className="game-topbar">
        <h3>Score: {score}</h3>
        <button onClick={() => ref.current.resetGame()}>Restart</button>
      </div>
      <div className="board" ref={boardRef}>
        {board.flatMap((row, i) =>
          row.map((cell, j) => {
            if (!cell) return null;
            const isNew = board.newTile?.[0] === i && board.newTile?.[1] === j;
            return (
              <div
                key={`${i}-${j}-${cell.value ?? cell}`}
                className={`tile tile-${cell.value} ${isNew ? "tile-new" : ""}`}
                style={{ transform: `translate(${j * 100}%, ${i * 100}%)` }}
              >
                {cell.value}
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
