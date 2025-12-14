import { Request, Response } from 'express';
import { z } from 'zod';
import { db, users } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { hashPassword, comparePassword } from '../utils/auth.js';
import { generateTokenPair, verifyRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../utils/tokens.js';
import { logAuthSuccess, logAuthFailure, logSecurityEvent } from '../utils/logger.js';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = signupSchema.parse(req.body);

    // Check if user exists
    const existing = await db.query.users.findFirst({
      where: (users, { or, eq }) => or(eq(users.email, email), eq(users.username, username)),
    });

    if (existing) {
      res.status(400).json({
        error: existing.email === email ? 'Email already exists' : 'Username already exists',
      });
      return;
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        email,
        username,
        passwordHash,
      })
      .returning();

    const tokens = await generateTokenPair(user.id, req.ip, req.get('user-agent'));

    logAuthSuccess(user.id, req.ip || 'unknown');

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        reputation: user.reputation,
        emailVerified: user.emailVerified,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Always hash to prevent timing attacks
    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const hash = user?.passwordHash || dummyHash;
    const isValid = await comparePassword(password, hash);

    if (!user || !isValid) {
      logAuthFailure(email, req.ip || 'unknown');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const tokens = await generateTokenPair(user.id, req.ip, req.get('user-agent'));

    logAuthSuccess(user.id, req.ip || 'unknown');

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        reputation: user.reputation,
        emailVerified: user.emailVerified,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        reputation: user.reputation,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Verify refresh token and get user ID
    const userId = await verifyRefreshToken(refreshToken);

    if (!userId) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Generate new token pair
    const tokens = await generateTokenPair(userId, req.ip, req.get('user-agent'));

    // Revoke old refresh token
    await revokeRefreshToken(refreshToken);

    logSecurityEvent('token_refreshed', { userId, ip: req.ip });

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Logout - revoke refresh token
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    await revokeRefreshToken(refreshToken);

    const userId = (req as any).userId;
    if (userId) {
      logSecurityEvent('user_logout', { userId, ip: req.ip });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Logout from all devices - revoke all refresh tokens for user
 */
export const logoutAll = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await revokeAllUserTokens(userId);

    logSecurityEvent('user_logout_all', { userId, ip: req.ip });

    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
