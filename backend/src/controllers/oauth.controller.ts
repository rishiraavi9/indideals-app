import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { refreshTokens } from '../db/schema.js';

export const handleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=authentication_failed`);
    }

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Generate refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in database
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt: refreshTokenExpiry,
    });

    // Set tokens in httpOnly cookies (secure in production)
    const isProduction = env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh',
    });

    // Redirect to frontend with success indicator (no token in URL)
    res.redirect(`${env.FRONTEND_URL}/oauth-success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${env.FRONTEND_URL}/login?error=server_error`);
  }
};
