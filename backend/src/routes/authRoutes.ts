import { Router } from 'express';
import passport from 'passport';
import '../config/passport';

const router = Router();

// redirect goole auth

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// google oauth callback route
router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173' }),
  (req, res) => {
    res.redirect('http://localhost:5173');
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
