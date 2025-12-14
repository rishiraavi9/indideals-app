import { Router } from 'express';
import passport from '../config/passport.js';
import { handleOAuthCallback } from '../controllers/oauth.controller.js';

const router = Router();

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  handleOAuthCallback
);

// Facebook OAuth routes
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'], session: false })
);

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
  handleOAuthCallback
);

export default router;
