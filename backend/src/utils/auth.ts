import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate access token (short-lived, 1 hour)
 */
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId, type: 'access' }, env.JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Generate refresh token (long-lived, 30 days)
 */
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId, type: 'refresh' }, env.JWT_SECRET, { expiresIn: '30d' });
};

/**
 * Verify access token
 */
export const verifyToken = (token: string): { userId: string; type: string } | null => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as { userId: string; type: string };
  } catch {
    return null;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string; type: string } | null => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; type: string };
    if (payload.type !== 'refresh') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};
