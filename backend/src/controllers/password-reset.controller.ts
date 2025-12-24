import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { users, passwordResetTokens, emailVerificationTokens } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { hashPassword } from '../utils/auth.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/email.service.js';
import { logSecurityEvent } from '../utils/logger.js';

// Request password reset
const requestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = requestResetSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    // Create new reset token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: hashedToken,
      expiresAt,
    });

    // Send reset email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken);

    if (!emailSent) {
      logSecurityEvent('password_reset_email_failed', { userId: user.id, email: user.email });
    }

    logSecurityEvent('password_reset_requested', { userId: user.id, email: user.email, ip: req.ip });

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reset password with token
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    // Hash the token to match stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.token, hashedToken),
        gt(passwordResetTokens.expiresAt, new Date())
      ),
    });

    if (!resetToken || resetToken.used) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, resetToken.userId));

    // Mark token as used
    await db.update(passwordResetTokens)
      .set({ used: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));

    logSecurityEvent('password_reset_completed', { userId: resetToken.userId, ip: req.ip });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send email verification
export const sendEmailVerification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: 'Email already verified' });
      return;
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing verification tokens for this user
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, user.id));

    // Create new verification token
    await db.insert(emailVerificationTokens).values({
      userId: user.id,
      token: hashedToken,
      expiresAt,
    });

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify email with token
const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);

    // Hash the token to match stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid verification token
    const verificationToken = await db.query.emailVerificationTokens.findFirst({
      where: and(
        eq(emailVerificationTokens.token, hashedToken),
        gt(emailVerificationTokens.expiresAt, new Date())
      ),
    });

    if (!verificationToken || verificationToken.used) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    // Update user email verification status
    await db.update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, verificationToken.userId));

    // Mark token as used
    await db.update(emailVerificationTokens)
      .set({ used: new Date() })
      .where(eq(emailVerificationTokens.id, verificationToken.id));

    logSecurityEvent('email_verified', { userId: verificationToken.userId, ip: req.ip });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
