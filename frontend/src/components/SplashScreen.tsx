import { useEffect } from 'react';
import './SplashScreen.css';

type SplashScreenProps = {
  onFinish: () => void;
};

function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(onFinish, 7000);
    return () => window.clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-screen" aria-label="Loading CT app">
      <div className="splash-content">
        <div className="logo-container">
          <div className="logo-wrap">
            <span className="logo-text logo-c">C</span>
            <span className="logo-text logo-t">T</span>
          </div>
        </div>
        <div className="tagline-container">
          <p className="splash-fulltext">connect Together</p>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
