import { Routes, Route } from 'react-router-dom';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import PreDashboardScreen from './PreDashboardScreen';
import Dashboard from './Dashboard';
import LeaderboardScreen from './LeaderboardScreen';
import ProtectedRoute from './ProtectedRoute';
import { useState, useEffect } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch logged-in user when app starts
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/api/me`, { credentials: 'include' });
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err);
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
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />
      <Route path="/pre-dashboard" element={<PreDashboardScreen />} />

      {/* Protected Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute user={user}>
            <Dashboard user={user} />
          </ProtectedRoute>
        }
      />

      {/* Protected Leaderboard */}
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute user={user}>
            <LeaderboardScreen user={user} />
          </ProtectedRoute>
        }
      />

      {/* Default route */}
      <Route path="*" element={<LoginScreen />} />
    </Routes>
  );
}

export default App;
