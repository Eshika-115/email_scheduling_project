import { Router } from 'express';
import passport from 'passport';
import '../config/passport';

const router = Router();

// redirect goole auth

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

const getFrontendUrl = () => {
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER || !!process.env.RENDER_SERVICE_ID;
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) {
    return process.env.FRONTEND_URL;
  }
  return isProduction
    ? 'https://frontend-xl-blue-19gueprtlq.vercel.app'
    : 'http://localhost:5173';
};

// google oauth callback route
router.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', (err: any, user: any, info: any) => {
    const frontendUrl = getFrontendUrl();
    if (err || !user) {
      console.error('Google Auth Error:', err || info);
      return res.redirect(frontendUrl);
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Login Session Error:', loginErr);
        return res.redirect(frontendUrl);
      }
      return res.redirect(frontendUrl);
    });
  })(req, res, next);
});

// current session status check 

router.get('/auth/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {

    return res.json({ authenticated: true, user: req.user });
  }
  res.json({ authenticated: false, user: null });
});

// logout session 
router.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

export default router;
