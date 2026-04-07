import React, { useState } from 'react';
import axios from 'axios';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const data = isRegister ? { name, email, password, role } : { email, password };
      const res = await axios.post(`http://localhost:5000${endpoint}`, data);
      if (isRegister) {
        setIsRegister(false);
      } else {
        localStorage.setItem('token', res.data.token);
        onLogin(res.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    }
  };

  return (
    <div className="login">
      <div className="login-container">
        <div className="logo">
          <h1>CT</h1>
          <span>Connect Together</span>
        </div>
        <p>{isRegister ? 'Create your account' : 'Sign in to your account'}</p>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {isRegister && (
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="instructor">Host (Instructor)</option>
            </select>
          )}
          <button type="submit">{isRegister ? 'Register' : 'Sign In'}</button>
        </form>
        <button className="toggle" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
        </button>
      </div>
    </div>
  );
};

export default Login;