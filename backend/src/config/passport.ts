import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { env } from './env.js';
import { db, users } from '../db/index.js';
import { eq } from 'drizzle-orm';

// Determine the base URL for OAuth callbacks
const getBaseUrl = () => {
  if (env.NODE_ENV === 'production') {
    // Use the API subdomain in production
    return 'https://api.desidealsai.com';
  }
  return `http://localhost:${env.PORT}`;
};

// Google OAuth Strategy
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${getBaseUrl()}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this Google ID
          let user = await db.query.users.findFirst({
            where: eq(users.googleId, profile.id),
          });

          if (!user) {
            // Check if user exists with this email
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await db.query.users.findFirst({
                where: eq(users.email, email),
              });

              if (user) {
                // Link Google account to existing user
                await db.update(users).set({ googleId: profile.id }).where(eq(users.id, user.id));
              }
            }

            // Create new user if doesn't exist
            if (!user) {
              const [newUser] = await db
                .insert(users)
                .values({
                  email: profile.emails?.[0]?.value || `${profile.id}@google.com`,
                  username: profile.displayName || `user_${profile.id.slice(0, 8)}`,
                  passwordHash: '', // No password for OAuth users
                  googleId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value || null,
                })
                .returning();
              user = newUser;
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// Facebook OAuth Strategy
if (env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: env.FACEBOOK_APP_ID,
        clientSecret: env.FACEBOOK_APP_SECRET,
        callbackURL: `${getBaseUrl()}/api/auth/facebook/callback`,
        profileFields: ['id', 'displayName', 'emails', 'photos'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this Facebook ID
          let user = await db.query.users.findFirst({
            where: eq(users.facebookId, profile.id),
          });

          if (!user) {
            // Check if user exists with this email
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await db.query.users.findFirst({
                where: eq(users.email, email),
              });

              if (user) {
                // Link Facebook account to existing user
                await db.update(users).set({ facebookId: profile.id }).where(eq(users.id, user.id));
              }
            }

            // Create new user if doesn't exist
            if (!user) {
              const [newUser] = await db
                .insert(users)
                .values({
                  email: profile.emails?.[0]?.value || `${profile.id}@facebook.com`,
                  username: profile.displayName || `user_${profile.id.slice(0, 8)}`,
                  passwordHash: '', // No password for OAuth users
                  facebookId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value || null,
                })
                .returning();
              user = newUser;
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

export default passport;
