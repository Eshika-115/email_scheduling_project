import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cleanEnv = (val?: string) => (val ? val.trim().replace(/^["']|["']$/g, '') : undefined);

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER || !!process.env.RENDER_SERVICE_ID;

const clientID = cleanEnv(process.env.GOOGLE_CLIENT_ID) || '560786438474-f2qovsksrt1oe0rsubkalcv4i6o4r0ca.apps.googleusercontent.com';
const clientSecret = cleanEnv(process.env.GOOGLE_CLIENT_SECRET) || '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';
const envCallback = cleanEnv(process.env.GOOGLE_CALLBACK_URL);

const defaultCallback = isProduction
    ? 'https://outbox-lab-assignment.onrender.com/api/auth/google/callback'
    : 'http://localhost:5000/api/auth/google/callback';

let callbackURL = envCallback || defaultCallback;
if (isProduction && callbackURL.includes('localhost')) {
    callbackURL = 'https://outbox-lab-assignment.onrender.com/api/auth/google/callback';
}

// google oauth setup 
passport.use(
    new GoogleStrategy(
        {
            clientID,
            clientSecret,
            callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value || 'user@example.com';
                const name = profile.displayName || 'Google User';
                const avatarUrl = profile.photos?.[0]?.value || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

                let user;
                try {
                    user = await prisma.user.upsert({
                        where: { email },
                        update: { name, avatarUrl },
                        create: {
                            googleId: profile.id || `google-${Date.now()}`,
                            email,
                            name,
                            avatarUrl,
                        },
                    });
                } catch (dbErr) {
                    console.error('Prisma upsert error during google auth:', dbErr);
                    user = {
                        id: `user-${Date.now()}`,
                        googleId: profile.id || `google-${Date.now()}`,
                        email,
                        name,
                        avatarUrl,
                    };
                }

                return done(null, user);
            } catch (err) {
                console.error('Passport strategy error:', err);
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
