// src/App.js
import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PreDashboardScreen from './PreDashboardScreen';
import Dashboard from './Dashboard';
import LeaderboardScreen from './LeaderboardScreen';

function App() {
  const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check URL hash for token (from Twitter login redirect)
    const hash = window.location.hash;
    if (hash.includes('token=')) {
      const urlToken = hash.split('token=')[1];
      localStorage.setItem('jwtToken', urlToken);
      setToken(urlToken);
      window.location.hash = ''; // remove token from URL
    }
    setLoading(false);
  }, []);

  if (loading) return <p>Loading...</p>;

  const PrivateRoute = ({ children }) => {
    return token ? children : <Navigate to="/" replace />;
  };

  return (
    <Routes>
      <Route path="/" element={<PreDashboardScreen setToken={setToken} />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <PrivateRoute>
            <LeaderboardScreen />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
