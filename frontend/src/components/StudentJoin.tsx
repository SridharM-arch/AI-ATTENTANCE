import React, { useState } from 'react';
import axios from 'axios';
import type { Session } from '../types';
import './StudentJoin.css';

interface StudentJoinProps {
  onJoin: (session: Session) => void;
  onBack: () => void;
}

const StudentJoin: React.FC<StudentJoinProps> = ({ onJoin, onBack }) => {
  const [sessionCode, setSessionCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionCode.trim()) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');
    setLoading(true);

    try {
      const res = await axios.get(
        `http://localhost:5000/api/sessions/public/join/${sessionCode.trim()}`
      );
      setStatus('valid');
      setTimeout(() => onJoin(res.data), 500);
    } catch {
      setStatus('invalid');
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'checking':
        return 'Checking session...';
      case 'valid':
        return 'Session found! Joining...';
      case 'invalid':
        return 'Invalid code. Enter a valid Room ID or Host ID.';
      default:
        return '';
    }
  };

  return (
    <div className="student-join">
      <div className="join-container">
        <button className="back-button" onClick={onBack}>Back</button>
        <h1>Join Session</h1>
        <p>Enter Room ID or Host ID provided by the host.</p>
        <p className={`status ${status}`}>{getStatusMessage()}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Room ID / Host ID"
            value={sessionCode}
            onChange={(e) => {
              setSessionCode(e.target.value);
              setStatus('idle');
            }}
            required
            autoFocus
          />
          <button type="submit" disabled={loading || status === 'checking'}>
            {loading ? 'Joining...' : 'Join'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentJoin;
