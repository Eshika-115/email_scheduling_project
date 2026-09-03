import { useState, useEffect } from 'react';
import axios from 'axios';
import { LoginPage } from './components/LoginPage';
import { DashboardPage } from './components/DashboardPage';

const API_BASE = 'http://localhost:5000/api';

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // app boot hone par auth status check kr rhe
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE}/auth/me`, { withCredentials: true });
        if (res.data.authenticated) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#00a859', fontWeight: 600 }}>
        Loading ReachInbox Session...
      </div>
    );
  }

  // logged in nahi h  toh login page dikhega 
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  // login done dashboard open
  return <DashboardPage />;
}

export default App;
