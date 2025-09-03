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
  const [aztecLetters, setAztecLetters] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [backendTest, setBackendTest] = useState('Testing backend...');
  const [form, setForm] = useState({ username: '', email: '', password: '', mode: 'login' });

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
      if (res.ok) setUser(data);
      else setErrorMsg(data.error || 'Failed to fetch user');
    } catch (err) {
      setErrorMsg('Network error fetching user');
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUser(); }, []);

  // Backend test
  useEffect(() => {
    const testBackend = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/api/me`, { credentials: 'include' });
        setBackendTest(`Backend status: ${res.status}`);
      } catch (err) { setBackendTest(`Backend test failed: ${err.message}`); }
    };
    testBackend();
  }, []);

  // Handle auth (login/register)
  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const endpoint = form.mode === 'login' ? 'login' : 'register';
      const res = await fetch(`${BACKEND_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (res.ok) fetchUser();
      else setErrorMsg(data.error || 'Authentication failed');
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, { method: 'GET', credentials: 'include' });
      setUser(null);
    } catch (err) { console.error(err); }
  };

  const handleScoreChange = (score) => {
    const letters = AZTEC_MILESTONES.filter(m => score >= m.score).map(m => m.letter);
    const newLetters = letters.filter(l => !aztecLetters.includes(l));
    if (lettersTimeoutRef.current) clearTimeout(lettersTimeoutRef.current);
    lettersTimeoutRef.current = setTimeout(() => newLetters.forEach(l => playLetterSound(l)), 50);
    setAztecLetters(letters);
  };

  const handleReset = () => {
    setAztecLetters([]);
    if (gameRef.current) gameRef.current.resetGame();
  };

  if (loading) return <p className="loading-msg">Loading...</p>;

  if (!user) {
    return (
      <div className="auth-container">
        <h3>{form.mode === 'login' ? 'Login' : 'Register'}</h3>
        <form onSubmit={handleAuth}>
          {form.mode === 'register' && (
            <input type="text" placeholder="Username" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          )}
          <input type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input type="password" placeholder="Password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button type="submit">{form.mode === 'login' ? 'Login' : 'Register'}</button>
        </form>
        <button className="switch-btn" onClick={() => setForm({ ...form, mode: form.mode === 'login' ? 'register' : 'login' })}>
          Switch to {form.mode === 'login' ? 'Register' : 'Login'}
        </button>
        {errorMsg && <p className="error-msg">{errorMsg}</p>}
        <p className="backend-test">{backendTest}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-game-container">
      {/* Sidebar */}
      <div className="sidebar">
        <h2>Dashboard</h2>
        <div className="profile">
          <img src="https://via.placeholder.com/50" alt="Profile" />
          <p>{user.username}</p>
        </div>
        <button className="sidebar-btn reset" onClick={handleReset}>Reset Game</button>
        <button className="sidebar-btn leaderboard" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
        <button className="sidebar-btn logout" onClick={handleLogout}>Logout</button>
      </div>

      {/* Main content */}
      <div className="main-content">
        <div className="score-display">
          <span>Score: {gameRef.current?.currentScore || 0}</span>
          <div className="aztec-letters">{aztecLetters.map(l => <span key={l}>{l}</span>)}</div>
        </div>
        <Game2048 ref={gameRef} onScoreChange={handleScoreChange} backendUrl={BACKEND_URL} userId={user._id} />
      </div>
    </div>
  );
}
