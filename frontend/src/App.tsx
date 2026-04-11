import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import Landing from './components/Landing';
import HostLogin from './components/HostLogin';
import StudentJoin from './components/StudentJoin';
import HostDashboard from './components/HostDashboard';
import VideoChat from './components/VideoChat';
import SplashScreen from './components/SplashScreen';
import { ThemeProvider } from './components/ThemeProvider';
import type { User, Session } from './types';

function App() {
  const [currentView, setCurrentView] = useState<'splash' | 'landing' | 'hostLogin' | 'studentJoin' | 'dashboard' | 'video'>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setCurrentView('dashboard');
      return;
    }

    const splashTimer = window.setTimeout(() => {
      setCurrentView('landing');
    }, 7000);

    return () => window.clearTimeout(splashTimer);
  }, []);

  const handleSelectRole = (role: 'host' | 'student') => {
    if (role === 'host') setCurrentView('hostLogin');
    else setCurrentView('studentJoin');
  };

  const handleLogin = (userData: User) => {
    const normalizedUser = { ...userData, _id: userData._id || userData.id || '' };
    setUser(normalizedUser);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setCurrentView('dashboard');
  };

  const handleJoin = (sessionData: Session) => {
    if (!user) {
      const guestUser: User = {
        _id: `guest-${Date.now()}`,
        id: `guest-${Date.now()}`,
        name: 'Student',
        email: 'student@local',
        role: 'student'
      };
      setUser(guestUser);
    }
    setSession(sessionData);
    setCurrentView('video');
  };

  const handleStartSession = (sessionData: Session) => {
    setSession(sessionData);
    setCurrentView('video');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentView('landing');
  };

  const handleBack = () => {
    setCurrentView('landing');
  };

  const handleSplashFinish = () => {
    setCurrentView((view) => {
      if (view === 'splash') {
        return 'landing';
      }
      return view;
    });
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4
  };

  return (
    <ThemeProvider>
      <div className="App min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 dark:from-gray-950 dark:via-purple-950 dark:to-gray-950">
        <AnimatePresence mode="wait">
          {currentView === 'splash' && (
            <motion.div
              key="splash"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <SplashScreen onFinish={handleSplashFinish} />
            </motion.div>
          )}
          {currentView === 'landing' && (
            <motion.div
              key="landing"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Landing onSelectRole={handleSelectRole} />
            </motion.div>
          )}
          {currentView === 'hostLogin' && (
            <motion.div
              key="hostLogin"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <HostLogin onLogin={handleLogin} onBack={handleBack} />
            </motion.div>
          )}
          {currentView === 'studentJoin' && (
            <motion.div
              key="studentJoin"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <StudentJoin onJoin={handleJoin} onBack={handleBack} />
            </motion.div>
          )}
          {currentView === 'dashboard' && user && (
            <motion.div
              key="dashboard"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <HostDashboard user={user} onLogout={handleLogout} onStartSession={handleStartSession} />
            </motion.div>
          )}
          {currentView === 'video' && user && session && (
            <motion.div
              key="video"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <VideoChat user={user} session={session} onLogout={handleLogout} />
            </motion.div>
          )}
        </AnimatePresence>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#1f2937',
            },
          }}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;