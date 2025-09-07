import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
      console.log('Checking for token...');
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        setLoadingUser(false);
        return;
      }

      console.log('Token found:', token);

      try {
        const res = await fetch(`${BACKEND_URL}/auth/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let data = null;
        try {
          data = await res.json();
        } catch (err) {
          console.error('Failed to parse /me response:', err);
        }

        console.log('Fetched user data:', data);

        if (!res.ok || !data) {
          console.log('Token invalid or user fetch failed, clearing token');
          localStorage.removeItem('token');
          setUser(null);
        } else {
          setUser(data);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  if (loadingUser) return <p>Loading user data...</p>;

  console.log('Rendering App with user:', user);

  return (
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
  );
}

export default App;
