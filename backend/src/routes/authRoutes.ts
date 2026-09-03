import { Router } from 'express';
import passport from 'passport';
import '../config/passport';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER || !!process.env.RENDER_SERVICE_ID;

const getCallbackUrl = () => {
  const envCallback = process.env.GOOGLE_CALLBACK_URL?.trim().replace(/^["']|["']$/g, '');
  if (envCallback && !envCallback.includes('localhost')) {
    return envCallback;
  }
  return isProduction
    ? 'https://outbox-lab-assignment.onrender.com/api/auth/google/callback'
    : 'http://localhost:5000/api/auth/google/callback';
};

router.get('/auth/google', (req, res, next) => {
  if (req.query.returnTo && typeof req.query.returnTo === 'string' && req.session) {
    req.session.returnTo = req.query.returnTo;
  }
  const doAuth = () => {
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      callbackURL: getCallbackUrl(),
    })(req, res, next);
  };

  if (req.session && typeof req.session.save === 'function') {
    req.session.save(() => doAuth());
  } else {
    doAuth();
  }
});

const getFrontendUrl = (req: any) => {
  const savedUrl = req.session?.returnTo;
  if (savedUrl) {
    delete req.session.returnTo;
    return savedUrl;
  }
  const envFrontend = process.env.FRONTEND_URL || (process.env as any).FRONTENT_URL;
  if (envFrontend) {
    return envFrontend;
  }
  return isProduction
    ? 'https://frontend-git-main-eshika-115s-projects.vercel.app'
    : 'http://localhost:5173';
};

router.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', { callbackURL: getCallbackUrl(), session: false }, (err: any, user: any, info: any) => {
    const frontendUrl = getFrontendUrl(req);
    if (err || !user) {
      console.error('Google Auth Error:', err || info);
      const errorMsg = encodeURIComponent(err?.message || 'Authentication failed');
      const separator = frontendUrl.includes('?') ? '&' : '?';
      return res.redirect(`${frontendUrl}${separator}auth_error=${errorMsg}`);
    }

    const userObj = encodeURIComponent(JSON.stringify({
      id: user.id || 'google-user-id',
      name: user.name || 'Google User',
      email: user.email || 'user@example.com',
      avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
    }));

    const separator = frontendUrl.includes('?') ? '&' : '?';
    return res.redirect(`${frontendUrl}${separator}token=${user.id || 'demo-token'}&user=${userObj}`);
  })(req, res, next);
});

router.get('/auth/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ authenticated: true, user: req.user });
  }
  res.json({ authenticated: false, user: null });
});

router.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

export default router;
