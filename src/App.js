import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PreDashboardScreen from './PreDashboardScreen';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import Dashboard from './Dashboard';
import LeaderboardScreen from './LeaderboardScreen';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok || res.status === 204) {
          localStorage.removeItem('token');
          setUser(null);
        } else {
          const text = await res.text();
          if (!text) {
            localStorage.removeItem('token');
            setUser(null);
          } else {
            const data = JSON.parse(text);
            setUser(data);
          }
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <Routes>
      {/* Entry screen */}
      <Route path="/" element={<PreDashboardScreen />} />

      {/* Auth screens */}
      <Route path="/login" element={<LoginScreen setUser={setUser} />} />
      <Route path="/register" element={<RegisterScreen setUser={setUser} />} />

      {/* Dashboard protected */}
      <Route
        path="/dashboard"
        element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/login" replace />}
      />

      {/* Leaderboard public */}
      <Route path="/leaderboard" element={<LeaderboardScreen />} />

      {/* Fallback unknown routes → PreDashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
