import React, { useState } from 'react';
import './Auth.css';
import { useNavigate, Link } from 'react-router-dom';
import aztecLogo from './assets/azteclogo.jpg';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LoginScreen({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Login failed');

      localStorage.setItem('token', data.token);
      setUser(data.user);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <img src={aztecLogo} alt="Aztec Logo" className="auth-logo" />

      <div className="auth-card">
        <h2>Login</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} required onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} required onChange={e => setPassword(e.target.value)} />
          <button type="submit">Login</button>
        </form>
        <p>Don’t have an account? <Link to="/register">Register here</Link></p>
      </div>

      <div className="auth-info">
        <div className="airdrop-guide-wrapper">
          <div className="airdrop-guide">
            <ul>
              <li>Join the community on Discord, earn contributor roles, and help others.</li>
              <li>Stay tuned to official channels for updates.</li>
            </ul>
            <p className="note">🟡 Note: No airdrop has been officially announced. Participation doesn’t guarantee rewards.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
