import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { refreshTokens } from '../db/schema.js';
import { eq, and, gt, lt } from 'drizzle-orm';

const JWT_SECRET = env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = '7d'; // Long-lived refresh token

export interface TokenPayload {
  userId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate access token (short-lived, 15 minutes)
 */
export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate refresh token (long-lived, 7 days)
 * Stored in database for revocation capability
 */
export async function generateRefreshToken(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  // Generate cryptographically secure random token
  const token = crypto.randomBytes(64).toString('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Store in database
  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return token;
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<TokenPair> {
  const accessToken = generateAccessToken(userId);
  const refreshToken = await generateRefreshToken(userId, ipAddress, userAgent);

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token and return user ID
 */
export async function verifyRefreshToken(token: string): Promise<string | null> {
  const refreshToken = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.token, token),
      gt(refreshTokens.expiresAt, new Date())
    ),
  });

  // Check if token exists, is not expired, and is not revoked
  if (!refreshToken || refreshToken.revoked) {
    return null;
  }

  return refreshToken.userId;
}

/**
 * Revoke a refresh token (logout)
 */
export async function revokeRefreshToken(token: string): Promise<boolean> {
  try {
    await db
      .update(refreshTokens)
      .set({ revoked: new Date() })
      .where(eq(refreshTokens.token, token));
    return true;
  } catch (error) {
    console.error('Error revoking refresh token:', error);
    return false;
  }
}

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
export async function revokeAllUserTokens(userId: string): Promise<boolean> {
  try {
    await db
      .update(refreshTokens)
      .set({ revoked: new Date() })
      .where(eq(refreshTokens.userId, userId));
    return true;
  } catch (error) {
    console.error('Error revoking all user tokens:', error);
    return false;
  }
}

/**
 * Clean up expired tokens (run periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()));
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}
