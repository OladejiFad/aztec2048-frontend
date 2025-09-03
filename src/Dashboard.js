import React, { useEffect, useState, useRef } from 'react';
import './Dashboard.css';
import Game2048 from './Game2048';
import { playLetterSound } from './utils/letterSounds';
import { useNavigate } from 'react-router-dom';

const AZTEC_MILESTONES = [
  { score: 6000, letter: 'A' },
  { score: 12000, letter: 'Z' },
  { score: 18000, letter: 'T' },
  { score: 24000, letter: 'E' },
  { score: 30000, letter: 'C' },
];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [aztecLetters, setAztecLetters] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const gameRef = useRef();
  const lettersTimeoutRef = useRef();
  const navigate = useNavigate();

  // Fetch user info
  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/api/me`, { credentials: 'include' });
      if (res.status === 401) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setTotalScore(data.totalScore || 0);
      } else {
        setErrorMsg(data.error || 'Failed to fetch user');
      }
    } catch (err) {
      setErrorMsg('Network error fetching user');
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUser(); }, []);

  // Handle AZTEC letters
  const handleScoreChange = (score) => {
    const letters = AZTEC_MILESTONES.filter(m => score >= m.score).map(m => m.letter);
    const newLetters = letters.filter(l => !aztecLetters.includes(l));
    if (lettersTimeoutRef.current) clearTimeout(lettersTimeoutRef.current);
    lettersTimeoutRef.current = setTimeout(() => newLetters.forEach(l => playLetterSound(l)), 50);
    setAztecLetters(letters);
    setTotalScore(score);
  };

  // Reset game
  const handleReset = () => {
    setAztecLetters([]);
    if (gameRef.current) gameRef.current.resetGame();
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, { method: 'GET', credentials: 'include' });
      setUser(null);
    } catch (err) { console.error(err); }
  };

  if (loading) return <p className="loading-msg">Loading...</p>;
  if (!user) return <p className="error-msg">{errorMsg || "You are not logged in."}</p>;

  return (
    <div className="dashboard-game-container">
      {/* Sidebar for desktop */}
      <div className="sidebar">
        <h2>Dashboard</h2>
        <div className="profile">
          <img src="https://via.placeholder.com/50" alt="Profile" />
          <p>{user.username}</p>
        </div>
        <p className="total-score">Total Score: {totalScore}</p>
        <div className="aztec-letters">{aztecLetters.map(l => <span key={l}>{l}</span>)}</div>
        <button className="sidebar-btn reset" onClick={handleReset}>Reset</button>
        <button className="sidebar-btn leaderboard" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
        <button className="sidebar-btn logout" onClick={handleLogout}>Logout</button>
      </div>

      {/* Topbar for mobile */}
      <div className="topbar-container">
        <div className="topbar">
          <div className="topbar-left">
            <img className="topbar-profile-img" src="https://via.placeholder.com/40" alt="Profile" />
            <span className="topbar-name">{user.username}</span>
          </div>
          <button className="hamburger-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>☰</button>
        </div>
        {dropdownOpen && (
          <div className="dropdown">
            <p className="total-score">Total Score: {totalScore}</p>
            <div className="aztec-letters">{aztecLetters.map(l => <span key={l}>{l}</span>)}</div>
            <button className="sidebar-btn reset" onClick={handleReset}>Reset</button>
            <button className="sidebar-btn leaderboard" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
            <button className="sidebar-btn logout" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="main-content">
        <Game2048
          ref={gameRef}
          onScoreChange={handleScoreChange}
          backendUrl={BACKEND_URL}
          userId={user._id}
        />
      </div>
    </div>
  );
}
