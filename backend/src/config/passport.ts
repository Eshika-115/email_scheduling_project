import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCallback = process.env.NODE_ENV === 'production'
    ? 'https://outbox-lab-assignment-8gj5.onrender.com/api/auth/google/callback'
    : 'http://localhost:5000/api/auth/google/callback';

// google oauth setup 
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID || 'google-demo-client-id',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'google-demo-client-secret',
            callbackURL: process.env.GOOGLE_CALLBACK_URL || defaultCallback,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value || 'oliver.brown@domain.io';
                const name = profile.displayName || 'Oliver Brown';
                const avatarUrl = profile.photos?.[0]?.value || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

                // user record db me upsert kr rhe

                const user = await prisma.user.upsert({
                    where: { email },
                    update: { name, avatarUrl },
                    create: {
                        googleId: profile.id || 'google-demo-id-101',
                        email,
                        name,
                        avatarUrl,
                    },
                });

                return done(null, user);
            } catch (err) {
                return done(err as Error, undefined);
            }
        }
    )
);

// user session
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
