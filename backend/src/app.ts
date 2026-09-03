import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './queues/emailQueue';

import authRoutes from './routes/authRoutes';
import campaignRoutes from './routes/campaignRoutes';
import logRoutes from './routes/logRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import senderRoutes from './routes/senderRoutes';
import { requireAuth } from './middleware/authMiddleware';

const app = express();
app.set('trust proxy', 1);

const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER || !!process.env.RENDER_SERVICE_ID;

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://frontend-g5vnvlpex-eshika-115s-projects.vercel.app',
];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/+$/, ''));
}

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin) || !isProd) {
                return callback(null, true);
            }
            return callback(null, true);
        },
        credentials: true,
    })
);
app.use(express.json());

// express session, passport setup
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'super-secret-express-session-key',
        resave: false,
        saveUninitialized: false,
        proxy: true,
        cookie: {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(requireAuth);

// bull board admin dashboard setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());

// healthcheck route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// api routes register kr rhe
app.use('/api', authRoutes);
app.use('/api', campaignRoutes);
app.use('/api', logRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', senderRoutes);

export default app;
