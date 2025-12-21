import { Request, Response } from 'express';
import { db } from '../db/index.js';
import {
  users,
  deals,
  comments,
  votes,
  commentVotes,
  userActivity,
  affiliateClicks,
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logSecurityEvent } from '../utils/logger.js';
import { revokeAllUserTokens } from '../utils/tokens.js';

/**
 * Export all user data (GDPR Article 15 - Right of access)
 */
export const exportUserData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Fetch all user data
    const [userData] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, userId),
      }),
    ]);

    if (!userData) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Fetch user's deals
    const userDeals = await db.query.deals.findMany({
      where: eq(deals.userId, userId),
    });

    // Fetch user's comments
    const userComments = await db.query.comments.findMany({
      where: eq(comments.userId, userId),
    });

    // Fetch user's votes
    const userVotes = await db.query.votes.findMany({
      where: eq(votes.userId, userId),
    });

    // Fetch user's comment votes
    const userCommentVotes = await db.query.commentVotes.findMany({
      where: eq(commentVotes.userId, userId),
    });

    // Fetch user activity
    const activity = await db.query.userActivity.findMany({
      where: eq(userActivity.userId, userId),
    });

    // Fetch affiliate clicks
    const clicks = await db.query.affiliateClicks.findMany({
      where: eq(affiliateClicks.userId, userId),
    });

    // Remove sensitive data
    const { passwordHash, ...userDataWithoutPassword } = userData;

    const exportData = {
      exportDate: new Date().toISOString(),
      user: userDataWithoutPassword,
      deals: userDeals,
      comments: userComments,
      votes: userVotes,
      commentVotes: userCommentVotes,
      activity,
      affiliateClicks: clicks,
      dataRetentionPolicy: {
        userProfile: 'Retained until account deletion',
        deals: 'Retained indefinitely for community benefit',
        comments: 'Retained indefinitely for community benefit',
        votes: 'Retained indefinitely for voting integrity',
        activity: 'Retained for 2 years',
        affiliateClicks: 'Retained for 3 years (legal requirement)',
      },
    };

    logSecurityEvent('user_data_exported', { userId, ip: req.ip });

    res.json(exportData);
  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete user account and personal data (GDPR Article 17 - Right to erasure)
 */
export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Fetch user to confirm existence
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Revoke all refresh tokens
    await revokeAllUserTokens(userId);

    // Anonymize user's deals (keep for community, but remove user association)
    await db
      .update(deals)
      .set({
        userId: '00000000-0000-0000-0000-000000000000', // Anonymous user ID
      })
      .where(eq(deals.userId, userId));

    // Anonymize user's comments (keep for community context)
    await db
      .update(comments)
      .set({
        userId: '00000000-0000-0000-0000-000000000000', // Anonymous user ID
        content: '[deleted]',
      })
      .where(eq(comments.userId, userId));

    // Delete user activity (not needed for community)
    await db.delete(userActivity).where(eq(userActivity.userId, userId));

    // Delete affiliate clicks (or anonymize if needed for reporting)
    await db
      .update(affiliateClicks)
      .set({
        userId: null,
        anonymousId: `deleted-${userId}`,
      })
      .where(eq(affiliateClicks.userId, userId));

    // Delete user account (cascade will delete votes, comment votes, tokens, etc.)
    await db.delete(users).where(eq(users.id, userId));

    logSecurityEvent('user_account_deleted', { userId, email: user.email, ip: req.ip });

    res.json({
      message: 'Account deleted successfully',
      deletedAt: new Date().toISOString(),
      dataRetention: {
        deleted: ['User profile', 'User activity', 'Refresh tokens', 'Votes'],
        anonymized: ['Deals', 'Comments', 'Affiliate clicks'],
        reason: 'Community benefit and legal requirements',
      },
    });
  } catch (error) {
    console.error('Delete user account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user's data processing information (GDPR transparency)
 */
export const getDataProcessingInfo = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const info = {
      dataController: {
        name: 'DesiDealsAI',
        contact: 'privacy@desidealsai.com',
      },
      dataCollected: {
        registration: ['Email', 'Username', 'Password (hashed)', 'Avatar URL'],
        usage: ['Deals posted', 'Comments', 'Votes', 'Browsing activity'],
        technical: ['IP address', 'User agent', 'Session data'],
        affiliate: ['Click tracking', 'Conversion data'],
      },
      purposeOfProcessing: [
        'Provide deals and community platform services',
        'User authentication and authorization',
        'Personalized content recommendations',
        'Affiliate program participation',
        'Platform improvement and analytics',
      ],
      legalBasis: 'Consent and contract performance (GDPR Article 6)',
      dataRetentionPeriod: {
        account: 'Until account deletion',
        activity: '2 years',
        affiliateData: '3 years (legal requirement)',
      },
      yourRights: [
        'Right to access (export your data)',
        'Right to rectification (update your profile)',
        'Right to erasure (delete your account)',
        'Right to data portability',
        'Right to object to processing',
        'Right to withdraw consent',
      ],
      dataSecurity: [
        'Password hashing (bcrypt)',
        'HTTPS encryption',
        'JWT authentication with refresh tokens',
        'Rate limiting and DDoS protection',
        'Input sanitization and XSS prevention',
        'SQL injection prevention (parameterized queries)',
      ],
      thirdPartySharing: {
        affiliatePartners: 'Click and conversion data shared for commission calculation',
        emailService: 'Email address for transactional emails',
        cloudInfrastructure: 'Data hosted on secure cloud infrastructure',
      },
    };

    res.json(info);
  } catch (error) {
    console.error('Get data processing info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
