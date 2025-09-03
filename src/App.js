import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PreDashboardScreen from './PreDashboardScreen';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import Dashboard from './Dashboard';
import LeaderboardScreen from './LeaderboardScreen';
import ProtectedRoute from './ProtectedRoute';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/api/me`, {
          credentials: 'include',
        });
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
      {/* First screen: show PreDashboard if not logged in, else skip to Dashboard */}
      <Route
        path="/"
        element={
          user ? <Navigate to="/dashboard" replace /> : <PreDashboardScreen />
        }
      />

      {/* Login & Register */}
      <Route path="/login" element={<LoginScreen setUser={setUser} />} />
      <Route path="/register" element={<RegisterScreen setUser={setUser} />} />

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

      {/* Default fallback → if route not found */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
