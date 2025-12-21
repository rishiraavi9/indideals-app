import { Request, Response } from 'express';
import { verifyRefreshToken, generateToken, generateRefreshToken } from '../utils/auth.js';
import { db, refreshTokens, users } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Check if refresh token exists in database and is not revoked
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, refreshToken),
          eq(refreshTokens.userId, payload.userId),
          eq(refreshTokens.revoked, false)
        )
      )
      .limit(1);

    if (!tokenRecord) {
      res.status(401).json({ error: 'Refresh token not found or revoked' });
      return;
    }

    // Check if refresh token has expired
    if (tokenRecord.expiresAt < new Date()) {
      // Revoke expired token
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.id, tokenRecord.id));

      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    // Get user info
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        avatarUrl: users.avatarUrl,
        reputation: users.reputation,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate new access token
    const newAccessToken = generateToken(user.id);

    // Optionally: Rotate refresh token (generate new one and revoke old one)
    // This is more secure but requires client to update both tokens
    const newRefreshToken = generateRefreshToken(user.id);

    // Revoke old refresh token
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.id, tokenRecord.id));

    // Store new refresh token
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    logger.info(`Token refreshed for user ${user.id}`);

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        reputation: user.reputation,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Revoke refresh token (logout)
 */
export const revokeRefreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    // Revoke the token
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.token, refreshToken));

    res.json({ message: 'Refresh token revoked successfully' });
  } catch (error) {
    logger.error('Token revocation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
