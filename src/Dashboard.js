import React, { useEffect, useState, useRef } from 'react';
import './Dashboard.css';
import Game2048 from './Game2048';
import { playLetterSound } from './utils/letterSounds';

const AZTEC_MILESTONES = [
  { score: 6000, letter: 'A' },
  { score: 12000, letter: 'Z' },
  { score: 18000, letter: 'T' },
  { score: 24000, letter: 'E' },
  { score: 30000, letter: 'C' },
];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [aztecLetters, setAztecLetters] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({ username: '', email: '', password: '', mode: 'login' });

  const gameRef = useRef();
  const lettersTimeoutRef = useRef(null);

  // --- Fetch user info ---
  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/api/me`, {
        credentials: 'include',
      });

      if (res.status === 401) {
        setUser(null);
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setTotalScore(data.totalScore || 0);
      } else {
        setUser(null);
        setErrorMsg(data.error || 'Failed to fetch user');
      }
    } catch (err) {
      setUser(null);
      setErrorMsg('Network error fetching user');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // --- Handle login/register form ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const endpoint = form.mode === 'login' ? 'login' : 'register';
      const res = await fetch(`${BACKEND_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        fetchUser(); // refresh user session
      } else {
        setErrorMsg(data.error || 'Authentication failed');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMsg('Network error');
    }
  };

  // --- Logout ---
  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'GET',
        credentials: 'include',
      });
      setUser(null);
      setTotalScore(0);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // --- AZTEC letters ---
  const handleScoreChange = (score) => {
    const letters = AZTEC_MILESTONES.filter(m => score >= m.score).map(m => m.letter);
    const newLetters = letters.filter(l => !aztecLetters.includes(l));

    if (lettersTimeoutRef.current) clearTimeout(lettersTimeoutRef.current);
    lettersTimeoutRef.current = setTimeout(() => {
      newLetters.forEach(letter => playLetterSound(letter));
    }, 50);

    setAztecLetters(letters);
  };

  // --- Game reset ---
  const handleReset = () => {
    setAztecLetters([]);
    if (gameRef.current) gameRef.current.resetGame();
  };

  if (loading) return <p>Loading...</p>;

  if (!user) {
    return (
      <div className="auth-container">
        <h3>{form.mode === 'login' ? 'Login' : 'Register'}</h3>
        <form onSubmit={handleAuth}>
          {form.mode === 'register' && (
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button type="submit">
            {form.mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
        <button
          onClick={() =>
            setForm({ ...form, mode: form.mode === 'login' ? 'register' : 'login' })
          }
        >
          Switch to {form.mode === 'login' ? 'Register' : 'Login'}
        </button>
        {errorMsg && <p className="error-msg">{errorMsg}</p>}
      </div>
    );
  }

  return (
    <div className="dashboard-game-container">
      <div className="dashboard-header">
        <p>Welcome, {user.displayName || user.username}!</p>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <Game2048
        ref={gameRef}
        totalScore={totalScore}
        onScoreChange={handleScoreChange}
        onReset={handleReset}
      />
    </div>
  );
}

export default Dashboard;
