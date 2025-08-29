// src/App.js
import { Routes, Route } from 'react-router-dom';
import PreDashboardScreen from './PreDashboardScreen';
import Dashboard from './Dashboard';
import LeaderboardScreen from './LeaderboardScreen';

function App() {
  return (
    <Routes>
      <Route path="/" element={<PreDashboardScreen />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/leaderboard" element={<LeaderboardScreen />} />
    </Routes>
  );
}

export default App;
