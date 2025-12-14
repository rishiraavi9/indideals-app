import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const handleOAuthCallback = (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.redirect(`${env.FRONTEND_URL}?error=authentication_failed`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${env.FRONTEND_URL}?token=${token}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${env.FRONTEND_URL}?error=server_error`);
  }
};
