import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, LogIn, Loader } from 'lucide-react';
import type { Session } from '../types';

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
      toast.error('Please enter a session code');
      return;
    }

    setStatus('checking');
    setLoading(true);

    try {
    const res = await axios.get(
      `https://ai-attentance.onrender.com/api/sessions/public/join/${sessionCode.trim()}`,
    );
      setStatus('valid');
      toast.success('Session found! Joining...');
      setTimeout(() => onJoin(res.data), 500);
    } catch (error) {
      setStatus('invalid');
      toast.error('Invalid code. Enter a valid Room ID or Host ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600 rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-600 rounded-full opacity-20 blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="relative">
          {/* Animated glow background */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 to-teal-600/30 rounded-2xl blur-2xl opacity-40 animate-pulse" />
          
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
                Join Session
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/70"
              >
                Enter the Room ID or Host ID provided by the instructor
              </motion.p>
            </div>

            {/* Form */}
            <motion.form 
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              {/* Input Field */}
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Enter Room ID / Host ID"
                  value={sessionCode}
                  onChange={(e) => {
                    setSessionCode(e.target.value);
                    setStatus('idle');
                  }}
                  autoFocus
                  className="w-full px-5 py-3 rounded-xl border border-white/40 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:shadow-lg focus:shadow-emerald-500/20 transition-all duration-300 text-lg backdrop-blur-xl hover:border-white/60 focus:bg-white/25 caret-white"
                />
              </div>

              {/* Status Message */}
              {status !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 backdrop-blur-xl border ${
                    status === 'checking' ? 'bg-blue-500/20 border-blue-400/50 text-blue-200' :
                    status === 'valid' ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200' :
                    'bg-red-500/20 border-red-400/50 text-red-200'
                  }`}
                >
                  {status === 'checking' && (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Checking session...
                    </>
                  )}
                  {status === 'valid' && '✓ Session found! Joining...'}
                  {status === 'invalid' && '✗ Invalid code. Please try again.'}
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button 
                type="submit" 
                disabled={loading || status === 'checking'}
                whileHover={!loading ? { scale: 1.05, y: -2 } : undefined}
                whileTap={!loading ? { scale: 0.95 } : undefined}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-xl hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Join Session
                  </>
                )}
              </motion.button>
            </motion.form>

            {/* Helper Text */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center text-sm text-white/60 mt-6"
            >
              Ask your instructor for the Room ID or Host ID to join
            </motion.p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentJoin;
