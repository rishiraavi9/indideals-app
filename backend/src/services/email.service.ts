import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const FROM_NAME = process.env.FROM_NAME || 'DesiDealsAI';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
});

// Verify connection configuration
export async function verifyEmailConnection(): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    logger.warn('Email service not configured - SMTP credentials missing');
    return false;
  }

  try {
    await transporter.verify();
    logger.info('Email service connected successfully');
    return true;
  } catch (error) {
    logger.error('Email service connection failed', { error });
    return false;
  }
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    logger.warn('Cannot send email - SMTP not configured', { to: options.to });
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    logger.info('Email sent successfully', { to: options.to, subject: options.subject });
    return true;
  } catch (error) {
    logger.error('Failed to send email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
    });
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Password Reset Request</h2>
        <p>Hi there,</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <div class="footer">
          <p>This is an automated email from DesiDealsAI. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Reset Request

Hi there,

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset - DesiDealsAI',
    text,
    html,
  });
}

/**
 * Send email verification
 */
export async function sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Welcome to DesiDealsAI!</h2>
        <p>Thanks for signing up! Please verify your email address to get started.</p>
        <p style="margin: 30px 0;">
          <a href="${verifyUrl}" class="button">Verify Email</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
        <div class="footer">
          <p>This is an automated email from DesiDealsAI. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to DesiDealsAI!

Thanks for signing up! Please verify your email address by clicking the link below:

${verifyUrl}

This link will expire in 24 hours.
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email - DesiDealsAI',
    text,
    html,
  });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(email: string, username: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Welcome to DesiDealsAI, ${username}!</h2>
        <p>Your account has been successfully verified.</p>
        <p>You can now start discovering and sharing amazing deals!</p>
        <a href="${process.env.FRONTEND_URL}" class="button">Start Exploring Deals</a>
        <p>Happy deal hunting!</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to DesiDealsAI!',
    html,
  });
}

/**
 * Send deal alert notification email
 */
export async function sendAlertEmail(
  email: string,
  alert: { keyword: string; id: string },
  deal: {
    title: string;
    description: string | null;
    price: number;
    originalPrice: number | null;
    discountPercentage: number | null;
    merchant: string;
    url: string | null;
    imageUrl: string | null;
  },
  frequency: 'instant' | 'daily' | 'weekly'
): Promise<boolean> {
  const priceFormatted = `₹${(deal.price / 100).toLocaleString('en-IN')}`;
  const originalPriceFormatted = deal.originalPrice
    ? `₹${(deal.originalPrice / 100).toLocaleString('en-IN')}`
    : null;
  const discountText = deal.discountPercentage ? `${deal.discountPercentage}% OFF` : '';

  const dealUrl = deal.url || `${process.env.FRONTEND_URL}/deals/${deal.title}`;
  const unsubscribeUrl = `${process.env.FRONTEND_URL}/alerts/${alert.id}/unsubscribe`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 8px; }
        .header { background-color: #FF5722; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .deal-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .deal-image { max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 15px; }
        .price { font-size: 28px; font-weight: bold; color: #4CAF50; }
        .original-price { text-decoration: line-through; color: #999; margin-left: 10px; font-size: 18px; }
        .discount-badge { display: inline-block; background-color: #FF5722; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; margin-left: 10px; }
        .merchant { color: #666; font-size: 14px; margin-top: 10px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #FF5722; color: white !important; text-decoration: none; border-radius: 4px; margin-top: 20px; font-weight: bold; }
        .button:hover { background-color: #E64A19; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .unsubscribe { font-size: 12px; color: #999; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🔔 New Deal Alert!</h1>
          <p style="margin: 10px 0 0 0;">Matching your alert: "${alert.keyword}"</p>
        </div>

        <div class="deal-card">
          ${deal.imageUrl ? `<img src="${deal.imageUrl}" alt="${deal.title}" class="deal-image">` : ''}

          <h2 style="margin-top: 0; color: #333;">${deal.title}</h2>

          ${deal.description ? `<p>${deal.description}</p>` : ''}

          <div style="margin: 20px 0;">
            <span class="price">${priceFormatted}</span>
            ${originalPriceFormatted ? `<span class="original-price">${originalPriceFormatted}</span>` : ''}
            ${discountText ? `<span class="discount-badge">${discountText}</span>` : ''}
          </div>

          <p class="merchant">
            <strong>Merchant:</strong> ${deal.merchant}
          </p>

          <a href="${dealUrl}" class="button">View Deal →</a>
        </div>

        <div class="footer">
          <p>This deal matches your alert for <strong>"${alert.keyword}"</strong></p>
          <p>You're receiving this because you subscribed to deal alerts on DesiDealsAI.</p>
          <p class="unsubscribe">
            <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe from this alert</a> |
            <a href="${process.env.FRONTEND_URL}/alerts" style="color: #999;">Manage all alerts</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
🔔 New Deal Alert!

"${deal.title}"

Price: ${priceFormatted} ${originalPriceFormatted ? `(was ${originalPriceFormatted})` : ''} ${discountText}
Merchant: ${deal.merchant}

${deal.description || ''}

View Deal: ${dealUrl}

---
You're receiving this because you subscribed to alerts for "${alert.keyword}".
Unsubscribe: ${unsubscribeUrl}
  `;

  return sendEmail({
    to: email,
    subject: `🔥 Deal Alert: ${deal.title} - ${priceFormatted}`,
    text,
    html,
  });
}

/**
 * Send price drop notification email
 */
export async function sendPriceDropEmail(
  to: string,
  deal: any,
  newPrice: number,
  targetPrice: number
): Promise<boolean> {
  const newPriceFormatted = `₹${(newPrice / 100).toLocaleString('en-IN')}`;
  const targetPriceFormatted = `₹${(targetPrice / 100).toLocaleString('en-IN')}`;
  const dealUrl = `${process.env.FRONTEND_URL}/deals/${deal.id}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 8px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .deal-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .price { font-size: 32px; font-weight: bold; color: #4CAF50; }
        .target-price { font-size: 18px; color: #666; margin-top: 10px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white !important; text-decoration: none; border-radius: 4px; margin-top: 20px; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🎉 Price Drop Alert!</h1>
          <p style="margin: 10px 0 0 0;">Your target price has been reached!</p>
        </div>

        <div class="deal-card">
          <h2 style="margin-top: 0; color: #333;">${deal.title}</h2>

          <div style="margin: 20px 0;">
            <div class="price">${newPriceFormatted}</div>
            <div class="target-price">Your Target: ${targetPriceFormatted}</div>
          </div>

          <p>The price has dropped to or below your target price. Don't miss out on this deal!</p>

          <a href="${dealUrl}" class="button">View Deal →</a>
        </div>

        <div class="footer">
          <p>This price alert has been automatically deactivated. You can set a new price alert if needed.</p>
          <p><a href="${process.env.FRONTEND_URL}/alerts">Manage your price alerts</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
🎉 Price Drop Alert!

"${deal.title}"

New Price: ${newPriceFormatted}
Your Target: ${targetPriceFormatted}

The price has dropped to or below your target price!

View Deal: ${dealUrl}

---
This price alert has been automatically deactivated.
  `;

  return sendEmail({
    to,
    subject: `Price Drop: ${deal.title} - ${newPriceFormatted}`,
    text,
    html,
  });
}

/**
 * Send deal expired notification email
 */
export async function sendDealExpiredEmail(
  to: string,
  dealId: string,
  reason: string
): Promise<boolean> {
  const dealUrl = `${process.env.FRONTEND_URL}/deals/${dealId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 8px; }
        .header { background-color: #FF9800; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 20px; }
        .reason { background-color: #FFF3E0; padding: 15px; border-left: 4px solid #FF9800; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background-color: #FF9800; color: white !important; text-decoration: none; border-radius: 4px; margin-top: 20px; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⚠️ Deal Expired</h1>
        </div>

        <div class="content">
          <p>Hi there,</p>
          <p>Your deal has been automatically marked as expired by our verification system.</p>

          <div class="reason">
            <strong>Reason:</strong> ${reason}
          </div>

          <p>If you believe this was done in error, you can review the deal or post a new one.</p>

          <a href="${dealUrl}" class="button">View Deal →</a>
        </div>

        <div class="footer">
          <p>This is an automated message from the DesiDealsAI verification system.</p>
          <p>If you have questions, please contact support.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
⚠️ Deal Expired

Your deal has been automatically marked as expired.

Reason: ${reason}

View Deal: ${dealUrl}

---
If you believe this was done in error, please contact support.
  `;

  return sendEmail({
    to,
    subject: 'Your Deal Has Expired - DesiDealsAI',
    text,
    html,
  });
}
