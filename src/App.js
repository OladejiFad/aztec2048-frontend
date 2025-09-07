import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // --- Check token and fetch user on app start ---
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingUser(false);
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/auth/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) {
          localStorage.removeItem('token');
          setUser(null);
        } else {
          setUser(data);
        }
      } catch (err) {
        console.error(err);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  if (loadingUser) return <p>Loading...</p>;

  return (
    <Router>
      <Routes>
        {/* Protected Dashboard */}
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/login" replace />}
        />

        {/* Auth Screens */}
        <Route path="/login" element={<LoginScreen setUser={setUser} />} />
        <Route path="/register" element={<RegisterScreen setUser={setUser} />} />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
