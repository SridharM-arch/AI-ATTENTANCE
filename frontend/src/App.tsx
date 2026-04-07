import { useState, useEffect } from 'react';
import Landing from './components/Landing';
import HostLogin from './components/HostLogin';
import StudentJoin from './components/StudentJoin';
import HostDashboard from './components/HostDashboard';
import VideoChat from './components/VideoChat';
import SplashScreen from './components/SplashScreen';
import type { User, Session } from './types';
import './App.css';

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
    // Normalize user object to always have _id
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

  return (
    <div className="App">
      {currentView === 'splash' && <SplashScreen onFinish={handleSplashFinish} />}
      {currentView === 'landing' && <Landing onSelectRole={handleSelectRole} />}
      {currentView === 'hostLogin' && <HostLogin onLogin={handleLogin} onBack={handleBack} />}
      {currentView === 'studentJoin' && <StudentJoin onJoin={handleJoin} onBack={handleBack} />}
      {currentView === 'dashboard' && user && <HostDashboard user={user} onLogout={handleLogout} onStartSession={handleStartSession} />}
      {currentView === 'video' && user && session && (<VideoChat user={user} session={session} onLogout={handleLogout} />)}
    </div>
  );
}

export default App;
