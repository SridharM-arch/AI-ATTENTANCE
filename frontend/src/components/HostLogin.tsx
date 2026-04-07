import { useState } from 'react';
import type { User } from '../types';
import './HostLogin.css';

interface Props {
  onLogin: (user: User) => void;
  onBack: () => void;
}

const HostLogin = ({ onLogin, onBack }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    if (isRegister && !name) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister 
        ? { name, email, password, role: 'host' }
        : { email, password };

      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || (isRegister ? 'Registration failed' : 'Login failed'));
        setLoading(false);
        return;
      }

      if (isRegister) {
        alert('Registration successful! Please log in.');
        setIsRegister(false);
        setEmail('');
        setPassword('');
        setName('');
      } else {
        localStorage.setItem('token', data.token);
        onLogin(data.user);
      }
    } catch {
      alert('Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="host-login">
      <div className="login-container">
        <button className="back-button" onClick={onBack}>
          Back
        </button>
        <h1>{isRegister ? 'Register as Host' : 'Host Login'}</h1>
        <p>{isRegister ? 'Create your instructor account' : 'Sign in to manage your sessions and analytics.'}</p>

        {isRegister && (
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? (isRegister ? 'Registering...' : 'Logging in...') : (isRegister ? 'Register' : 'Login')}
        </button>

        <button 
          type="button" 
          onClick={() => {
            setIsRegister(!isRegister);
            setEmail('');
            setPassword('');
            setName('');
          }}
          style={{ marginTop: '10px', background: '#f5a52499', color: '#fff' }}
        >
          {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </div>
    </div>
  );
};

export default HostLogin;
