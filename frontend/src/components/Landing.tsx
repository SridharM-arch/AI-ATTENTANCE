import React from 'react';
import './Landing.css';

interface LandingProps {
  onSelectRole: (role: 'host' | 'student') => void;
}

const Landing: React.FC<LandingProps> = ({ onSelectRole }) => {
  return (
    <div className="landing">
      <div className="landing-container">
        <span className="landing-badge">AI Attendance Platform</span>
        <h1>Connect Together</h1>
        <p>Launch sessions with confidence and track attendance in real time.</p>
        <div className="role-options">
          <button className="role-card host-card" onClick={() => onSelectRole('host')}>
            <div className="role-icon">Host</div>
            <h2>Host Login</h2>
            <p>Create classes, monitor live participants, and review analytics.</p>
          </button>
          <button className="role-card student-card" onClick={() => onSelectRole('student')}>
            <div className="role-icon">Join</div>
            <h2>Student Join</h2>
            <p>Enter your room code and get into the session instantly.</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
