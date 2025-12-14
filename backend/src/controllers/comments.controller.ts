import { Request, Response } from 'express';
import { z } from 'zod';
import { db, comments, deals, commentVotes } from '../db/index.js';
import { eq, and, isNull, sql, desc, inArray } from 'drizzle-orm';
import type { AuthRequest } from '../middleware/auth.js';

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
});

export const getComments = async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const userId = (req as any).userId; // Optional user ID from auth middleware

    // Get top-level comments
    const commentsList = await db.query.comments.findMany({
      where: and(eq(comments.dealId, dealId), isNull(comments.parentId)),
      orderBy: [desc(sql`${comments.upvotes} - ${comments.downvotes}`)],
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
            reputation: true,
          },
        },
        replies: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                avatarUrl: true,
                reputation: true,
              },
            },
          },
          orderBy: [desc(comments.createdAt)],
        },
      },
    });

    // If user is authenticated, fetch their votes for all comments (including replies)
    let userVotes: Record<string, number> = {};
    if (userId && commentsList.length > 0) {
      const allCommentIds = commentsList.flatMap((c) => [
        c.id,
        ...(c.replies || []).map((r) => r.id),
      ]);

      if (allCommentIds.length > 0) {
        const userVotesList = await db.query.commentVotes.findMany({
          where: and(
            eq(commentVotes.userId, userId),
            inArray(commentVotes.commentId, allCommentIds)
          ),
        });

        userVotes = Object.fromEntries(
          userVotesList.map((v) => [v.commentId, v.voteType])
        );
      }
    }

    // Add userVote to each comment and reply
    const commentsWithVotes = commentsList.map((comment) => ({
      ...comment,
      userVote: userVotes[comment.id] || 0,
      replies: comment.replies?.map((reply) => ({
        ...reply,
        userVote: userVotes[reply.id] || 0,
      })),
    }));

    res.json(commentsWithVotes);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { dealId } = req.params;
    const { content, parentId } = createCommentSchema.parse(req.body);

    // Verify deal exists
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    // Verify parent comment exists if provided
    if (parentId) {
      const parentComment = await db.query.comments.findFirst({
        where: eq(comments.id, parentId),
      });

      if (!parentComment) {
        res.status(404).json({ error: 'Parent comment not found' });
        return;
      }
    }

    const [comment] = await db
      .insert(comments)
      .values({
        content,
        userId,
        dealId,
        parentId,
      })
      .returning();

    // Update deal comment count
    await db
      .update(deals)
      .set({ commentCount: sql`${deals.commentCount} + 1` })
      .where(eq(deals.id, dealId));

    // Fetch comment with user info
    const commentWithUser = await db.query.comments.findFirst({
      where: eq(comments.id, comment.id),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
            reputation: true,
          },
        },
      },
    });

    res.status(201).json(commentWithUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const voteComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { commentId } = req.params;
    const { voteType } = z
      .object({ voteType: z.number().int().min(-1).max(1) })
      .parse(req.body);

    // Verify comment exists
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    // Check existing vote
    const existingVote = await db.query.commentVotes.findFirst({
      where: and(eq(commentVotes.userId, userId), eq(commentVotes.commentId, commentId)),
    });

    if (voteType === 0) {
      // Remove vote
      if (existingVote) {
        await db.delete(commentVotes).where(eq(commentVotes.id, existingVote.id));

        // Update comment counts
        if (existingVote.voteType === 1) {
          await db
            .update(comments)
            .set({ upvotes: sql`${comments.upvotes} - 1` })
            .where(eq(comments.id, commentId));
        } else {
          await db
            .update(comments)
            .set({ downvotes: sql`${comments.downvotes} - 1` })
            .where(eq(comments.id, commentId));
        }
      }
    } else {
      if (existingVote) {
        // Update existing vote
        if (existingVote.voteType !== voteType) {
          await db.update(commentVotes).set({ voteType }).where(eq(commentVotes.id, existingVote.id));

          // Update comment counts (swap)
          if (voteType === 1) {
            await db
              .update(comments)
              .set({
                upvotes: sql`${comments.upvotes} + 1`,
                downvotes: sql`${comments.downvotes} - 1`,
              })
              .where(eq(comments.id, commentId));
          } else {
            await db
              .update(comments)
              .set({
                upvotes: sql`${comments.upvotes} - 1`,
                downvotes: sql`${comments.downvotes} + 1`,
              })
              .where(eq(comments.id, commentId));
          }
        }
      } else {
        // Create new vote
        await db.insert(commentVotes).values({ userId, commentId, voteType });

        // Update comment counts
        if (voteType === 1) {
          await db
            .update(comments)
            .set({ upvotes: sql`${comments.upvotes} + 1` })
            .where(eq(comments.id, commentId));
        } else {
          await db
            .update(comments)
            .set({ downvotes: sql`${comments.downvotes} + 1` })
            .where(eq(comments.id, commentId));
        }
      }
    }

    // Get updated comment with user vote
    const updatedComment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
            reputation: true,
          },
        },
      },
    });

    res.json(updatedComment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Vote comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
