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
    const fetchUser = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/api/me`, {
          method: 'GET',
          credentials: 'include', // always include cookies
        });

        if (!res.ok) {
          setUser(null);
          return;
        }

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error('❌ Failed to fetch user:', err);
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
      {/* Landing page */}
      <Route path="/" element={<PreDashboardScreen />} />

      {/* Login & Register */}
      <Route path="/login" element={<LoginScreen setUser={setUser} />} />
      <Route path="/register" element={<RegisterScreen setUser={setUser} />} />

      {/* Dashboard (protected) */}
      <Route
        path="/dashboard"
        element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />}
      />

      {/* Leaderboard (protected) */}
      <Route
        path="/leaderboard"
        element={user ? <LeaderboardScreen user={user} /> : <Navigate to="/login" replace />}
      />

      {/* Fallback for unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
