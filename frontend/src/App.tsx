import { useState, useEffect } from 'react';
import axios from 'axios';
import { LoginPage } from './components/LoginPage';
import { DashboardPage } from './components/DashboardPage';

import { API_BASE } from './config';

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // app boot hone par auth status check kr rhe
  useEffect(() => {
    const checkAuthStatus = async () => {
      // 1. Check URL query parameters (Google OAuth cross-domain redirect)
      const params = new URLSearchParams(window.location.search);
      const userParam = params.get('user');
      const tokenParam = params.get('token');

      if (userParam || tokenParam) {
        try {
          if (userParam) {
            const parsedUser = JSON.parse(decodeURIComponent(userParam));
            localStorage.setItem('reachinbox_user', JSON.stringify(parsedUser));
          }
          if (tokenParam) {
            localStorage.setItem('reachinbox_token', tokenParam);
          }
          setIsLoggedIn(true);
          window.history.replaceState({}, document.title, window.location.pathname);
          setLoading(false);
          return;
        } catch (e) {
          console.error('Error parsing auth params:', e);
        }
      }

      // 2. Check localStorage auth state
      const storedUser = localStorage.getItem('reachinbox_user');
      if (storedUser) {
        setIsLoggedIn(true);
        setLoading(false);
        return;
      }

      // 3. Fallback to API session check
      try {
        const res = await axios.get(`${API_BASE}/auth/me`, { withCredentials: true });
        if (res.data.authenticated) {
          setIsLoggedIn(true);
          if (res.data.user) {
            localStorage.setItem('reachinbox_user', JSON.stringify(res.data.user));
          }
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
