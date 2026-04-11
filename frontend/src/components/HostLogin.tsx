import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, Lock, UserPlus } from 'lucide-react';
import type { User } from '../types';

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
      toast.error('Please fill in all fields');
      return;
    }

    if (isRegister && !name) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister 
        ? { name, email, password, role: 'host' }
        : { email, password };

      const res = await fetch(`https://ai-attentance.onrender.com${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || (isRegister ? 'Registration failed' : 'Login failed'));
        setLoading(false);
        return;
      }

      if (isRegister) {
        toast.success('Registration successful! Please log in.');
        setIsRegister(false);
        setEmail('');
        setPassword('');
        setName('');
      } else {
        localStorage.setItem('token', data.token);
        toast.success('Login successful!');
        onLogin(data.user);
      }
    } catch (error) {
      toast.error('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600 rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-600 rounded-full opacity-20 blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="relative">
          {/* Animated glow background */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 to-purple-600/30 rounded-3xl blur-2xl opacity-40 animate-pulse" />
          
          {/* Main Card with Glassmorphism */}
          <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/5 rounded-2xl p-8 shadow-2xl border border-white/30 backdrop-blur-xl">
            {/* Back Button */}
            <motion.button
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="absolute top-6 left-6 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all duration-300 backdrop-blur-xl"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>

            {/* Header */}
            <div className="text-center mb-8 mt-4">
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent mb-3"
              >
                {isRegister ? 'Join as Host' : 'Host Login'}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/70"
              >
                {isRegister 
                  ? 'Create your instructor account to get started' 
                  : 'Sign in to manage your sessions and analytics'}
              </motion.p>
            </div>

            {/* Form Inputs */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              {isRegister && (
                <div className="relative group">
                  <UserPlus className="absolute left-4 top-4 w-5 h-5 text-white/50 group-focus-within:text-white transition-colors duration-300" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-white/40 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300 backdrop-blur-xl hover:border-white/60 focus:bg-white/25 caret-white"
                  />
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-4 top-4 w-5 h-5 text-white/50 group-focus-within:text-white transition-colors duration-300" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-white/40 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300 backdrop-blur-xl hover:border-white/60 focus:bg-white/25 caret-white"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-white/50 group-focus-within:text-white transition-colors duration-300" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-white/40 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300 backdrop-blur-xl hover:border-white/60 focus:bg-white/25 caret-white"
                />
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.button 
              type="button" 
              onClick={handleSubmit} 
              disabled={loading}
              whileHover={!loading ? { scale: 1.05, y: -2 } : undefined}
              whileTap={!loading ? { scale: 0.95 } : undefined}
              className="w-full mt-6 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 hover:from-indigo-600 hover:via-purple-600 hover:to-purple-700 text-white font-semibold shadow-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isRegister ? 'Registering...' : 'Logging in...') : (isRegister ? 'Register' : 'Login')}
            </motion.button>

            {/* Toggle Button */}
            <motion.button 
              type="button" 
              onClick={() => {
                setIsRegister(!isRegister);
                setEmail('');
                setPassword('');
                setName('');
              }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400/20 to-orange-400/20 hover:from-amber-400/40 hover:to-orange-400/40 border border-white/30 hover:border-white/50 text-white font-semibold transition-all duration-300 backdrop-blur-xl"
            >
              {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HostLogin;
