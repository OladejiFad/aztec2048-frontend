import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaDove } from 'react-icons/fa';
import './PreDashboardScreen.css';
import book from './assets/book.jpg';
import box from './assets/box.jpeg';

function PreDashboardScreen() {
  const navigate = useNavigate();

  const handleNextClick = () => {
    // Navigate to login first
    navigate('/login');
  };

  return (
    <div className="pre-dashboard">
      <div className="moon"></div>

      {/* Birds */}
      <FaDove className="bird-icon" style={{ top: '15%', left: '0%' }} />
      <FaDove className="bird-icon" style={{ top: '25%', left: '10%' }} />
      <FaDove className="bird-icon" style={{ top: '35%', left: '5%' }} />

      {/* Books with glowing orb */}
      <div className="books-container">
        <img src={book} alt="AZTEC Book" className="book box" />
        <div className="glowing-orb"></div>
        <img src={box} alt="Privacy Book" className="book book2" />
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

      {/* Next button */}
      <button className="next-btn" onClick={handleNextClick}>
        Next
      </button>
    </div>
  );
}

export default PreDashboardScreen;
