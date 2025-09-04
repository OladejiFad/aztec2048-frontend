import React, { useState, useRef } from 'react';
import './Dashboard.css';
import Game2048 from './Game2048';
import { playLetterSound } from './utils/letterSounds';
import { useNavigate } from 'react-router-dom';
import AztecLogo from './assets/azteclogo.jpg';

const AZTEC_MILESTONES = [
  { score: 6000, letter: 'A' },
  { score: 12000, letter: 'Z' },
  { score: 18000, letter: 'T' },
  { score: 24000, letter: 'E' },
  { score: 30000, letter: 'C' },
];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard({ user }) {
  const [totalScore, setTotalScore] = useState(user.totalScore || 0);
  const [aztecLetters, setAztecLetters] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const gameRef = useRef();
  const lettersTimeoutRef = useRef();
  const navigate = useNavigate();

  // --- Submit score to backend ---
  const submitScore = async (score) => {
    try {
      const res = await fetch(`${BACKEND_URL}/game/score`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error('Error submitting score:', errData);
        return;
      }

      const data = await res.json();
      setTotalScore(data.totalScore); // update local totalScore
    } catch (err) {
      console.error('Network or server error submitting score:', err);
    }
  };

  // --- Handle score change from Game2048 ---
  const handleScoreChange = (score) => {
    const letters = AZTEC_MILESTONES.filter(m => score >= m.score).map(m => m.letter);
    const newLetters = letters.filter(l => !aztecLetters.includes(l));

    if (lettersTimeoutRef.current) clearTimeout(lettersTimeoutRef.current);
    lettersTimeoutRef.current = setTimeout(() => newLetters.forEach(playLetterSound), 50);

    setAztecLetters(letters);
    submitScore(score); // send score to backend
  };

  // --- Reset game ---
  const handleReset = () => {
    setAztecLetters([]);
    gameRef.current?.resetGame();
  };

  // --- Logout ---
  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, { method: 'GET', credentials: 'include' });
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-game-container">
      {/* Sidebar for large screens */}
      <div className="sidebar">
        <img src={AztecLogo} alt="Aztec Logo" className="aztec-logo" />
        <div className="profile">
          <img src={user.photo || 'https://via.placeholder.com/50'} alt="Profile" />
          <p>{user.displayName}</p>
        </div>
        <p>Total Score: {totalScore}</p>
        <div className="aztec-letters">
          {aztecLetters.map(l => <span key={l}>{l}</span>)}
        </div>
        <button onClick={handleReset}>Reset</button>
        <button onClick={() => navigate('/leaderboard')}>Leaderboard</button>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {/* Topbar for small screens */}
      <div className="topbar">
        <div className="dropdown">
          <button onClick={() => setDropdownOpen(!dropdownOpen)}>☰</button>
          {dropdownOpen && (
            <div className="dropdown-menu">
              <button onClick={() => navigate('/leaderboard')}>Leaderboard</button>
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <Game2048
          ref={gameRef}
          onScoreChange={handleScoreChange}
        />
      </div>
    </div>
  );
}
