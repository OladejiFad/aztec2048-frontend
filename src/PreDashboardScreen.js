import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaDove } from 'react-icons/fa';
import './PreDashboardScreen.css';
import book from './assets/book.jpg';
import box from './assets/box.jpeg';

function PreDashboardScreen() {
  const navigate = useNavigate();

  return (
    <div className="pre-dashboard">
      {/* Birds */}
      <FaDove className="bird-icon" style={{ top: '15%', left: '0%', color: '#ffffffc5' }} />
      <FaDove className="bird-icon" style={{ top: '25%', left: '10%', color: '#f950f3ff' }} />
      <FaDove className="bird-icon" style={{ top: '35%', left: '5%', color: '#ffffffff' }} />

      {/* Moon and Books wrapped together */}
      <div className="moon-and-books">
        <div className="moon">
          <span className="moon-text">AZTEC</span>
        </div>
        <div className="books-container">
          <img src={book} alt="AZTEC Book" className="book box" />
          <div className="glowing-orb"></div>
          <img src={box} alt="Privacy Book" className="book book2" />
        </div>
      </div>

      {/* Privacy message */}
      <div className="privacy-message">
        <h1>
          <span className="glow">Privacy</span> is Our Priority
        </h1>
        <p>
          Your personal information is safe with us. Every action you take on our platform is handled
          with the utmost care, ensuring your data remains confidential, secure, and respected.
          Explore freely knowing that <span className="glow">your privacy is protected</span>.
        </p>
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        <button className="btn-login" onClick={() => navigate('/login')}>
          Login
        </button>
        <button className="btn-register" onClick={() => navigate('/register')}>
          Register
        </button>
      </div>
    </div>
  );
}

export default PreDashboardScreen;
