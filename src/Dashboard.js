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

  const gameRef = useRef();
  const popupRef = useRef(null);
  const popupIntervalRef = useRef(null);
  const lettersTimeoutRef = useRef(null);

  // --- Fetch user info ---
  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/api/me`, { credentials: 'include' });
      if (res.status === 401) {
        setUser(null);
        setErrorMsg('Session expired. Please log in.');
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setTotalScore(data.totalScore || 0);
        setErrorMsg('');
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

  // --- Twitter login ---
  const loginWithTwitter = () => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isSafari || isIOS) {
      window.location.href = `${BACKEND_URL}/auth/twitter?force_login=true`;
      return;
    }

    popupRef.current = window.open(
      `${BACKEND_URL}/auth/twitter?force_login=true`,
      'Twitter Login',
      'width=600,height=600'
    );

    popupIntervalRef.current = setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        clearInterval(popupIntervalRef.current);
        popupIntervalRef.current = null;
        window.location.reload();
      }
    }, 500);
  };

  // --- Cleanup ---
  useEffect(() => {
    return () => {
      if (popupIntervalRef.current) clearInterval(popupIntervalRef.current);
      if (lettersTimeoutRef.current) clearTimeout(lettersTimeoutRef.current);
    };
  }, []);

  if (loading) return <p>Loading...</p>;

  if (!user)
    return (
      <p>
        You are not logged in.{' '}
        <button onClick={loginWithTwitter}>Login with Twitter</button>
        {errorMsg && <span className="error-msg">{errorMsg}</span>}
      </p>
    );

  return (
    <div className="dashboard-game-container">
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
