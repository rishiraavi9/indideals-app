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

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
};
