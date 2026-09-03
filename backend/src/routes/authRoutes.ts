import { Router } from 'express';
import passport from 'passport';
import '../config/passport';

const router = Router();

// redirect goole auth

router.get('/auth/google', (req, res, next) => {
  if (req.query.returnTo && typeof req.query.returnTo === 'string') {
    (req.session as any).returnTo = req.query.returnTo;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

const getFrontendUrl = (req: any) => {
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER || !!process.env.RENDER_SERVICE_ID;
  const savedUrl = (req.session as any)?.returnTo;
  if (savedUrl) {
    delete (req.session as any).returnTo;
    return savedUrl;
  }
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  return isProduction
    ? 'https://frontend-g5vnvlpex-eshika-115s-projects.vercel.app'
    : 'http://localhost:5173';
};

// google oauth callback route
router.get('/auth/google/callback', (req, res, next) => {
  const frontendUrl = getFrontendUrl(req);
  passport.authenticate('google', (err: any, user: any, info: any) => {
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
