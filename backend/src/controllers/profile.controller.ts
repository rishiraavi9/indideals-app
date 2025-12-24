import { Request, Response } from 'express';
import { z } from 'zod';
import { db, users } from '../db/index.js';
import { eq, and, ne } from 'drizzle-orm';
import { hashPassword, comparePassword } from '../utils/auth.js';
import { logSecurityEvent } from '../utils/logger.js';

// Schema for updating profile
const updateProfileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

// Schema for changing password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// Schema for email preferences
const emailPreferencesSchema = z.object({
  dealAlerts: z.boolean().optional(),
  priceDrops: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  promotions: z.boolean().optional(),
});

/**
 * Get user profile
 */
export const getProfile = async (req: Request, res: Response) => {
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
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update user profile (username, avatar)
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = updateProfileSchema.parse(req.body);

    // Check if username is being changed and if it's already taken
    if (data.username) {
      const existingUser = await db.query.users.findFirst({
        where: and(
          eq(users.username, data.username),
          ne(users.id, userId)
        ),
      });

      if (existingUser) {
        res.status(400).json({ error: 'Username already taken' });
        return;
      }
    }

    // Build update object
    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.username !== undefined) {
      updateData.username = data.username;
    }
    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    logSecurityEvent('profile_updated', { userId, changes: Object.keys(data) });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        avatarUrl: updatedUser.avatarUrl,
        reputation: updatedUser.reputation,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Change password
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    // Get current user
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      logSecurityEvent('password_change_failed', { userId, reason: 'invalid_current_password' });
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    // Check if new password is same as old
    const isSamePassword = await comparePassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      res.status(400).json({ error: 'New password must be different from current password' });
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logSecurityEvent('password_changed', { userId });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get email preferences
 * Note: This is a placeholder - in a real app, you'd store these in a separate table
 */
export const getEmailPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // For now, return default preferences
    // In production, you'd fetch from a user_preferences table
    res.json({
      preferences: {
        dealAlerts: true,
        priceDrops: true,
        weeklyDigest: false,
        promotions: false,
      },
    });
  } catch (error) {
    console.error('Get email preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update email preferences
 * Note: This is a placeholder - in a real app, you'd store these in a separate table
 */
export const updateEmailPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const preferences = emailPreferencesSchema.parse(req.body);

    // For now, just acknowledge the update
    // In production, you'd save to a user_preferences table
    logSecurityEvent('email_preferences_updated', { userId, preferences });

    res.json({
      message: 'Email preferences updated successfully',
      preferences: {
        dealAlerts: preferences.dealAlerts ?? true,
        priceDrops: preferences.priceDrops ?? true,
        weeklyDigest: preferences.weeklyDigest ?? false,
        promotions: preferences.promotions ?? false,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update email preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
