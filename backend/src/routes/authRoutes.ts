import { Router } from 'express';
import passport from 'passport';
import '../config/passport';

const router = Router();

// redirect goole auth

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

const getFrontendUrl = () => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  return process.env.NODE_ENV === 'production'
    ? 'https://frontend-xl-blue-19gueprtlq.vercel.app'
    : 'http://localhost:5173';
};

// google oauth callback route
router.get(
  '/auth/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { failureRedirect: getFrontendUrl() })(req, res, next);
  },
  (req, res) => {
    res.redirect(getFrontendUrl());
  }
);

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
