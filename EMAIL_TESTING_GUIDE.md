# Email Testing Guide - IndiaDeals

**Last Updated**: December 14, 2025

---

## Overview

Your IndiaDeals application has 4 types of email notifications:
1. **Password Reset** - Sent when user requests password reset
2. **Email Verification** - Sent to verify new user accounts
3. **Welcome Email** - Sent after email verification
4. **Deal Alerts** - Sent when matching deals are posted

This guide shows you how to test each one.

---

## Quick Setup

### Option 1: Use Gmail (Easiest for Testing)

**Step 1: Enable 2-Factor Authentication on Gmail**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification

**Step 2: Generate App Password**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Name it "IndiaDeals Testing"
4. Copy the 16-character password

**Step 3: Update `.env` File**
```bash
cd backend
nano .env
```

Add these lines:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # 16-char app password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=IndiaDeals
FRONTEND_URL=http://localhost:5174
```

**Step 4: Restart Server**
```bash
npm run dev
```

---

### Option 2: Use Mailtrap (Best for Development)

Mailtrap is a fake SMTP server that catches all emails - perfect for testing!

**Step 1: Create Free Account**
1. Go to https://mailtrap.io
2. Sign up for free account
3. Go to "Email Testing" → "Inboxes" → "My Inbox"
4. Click "Show Credentials"

**Step 2: Update `.env` File**
```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
FROM_EMAIL=noreply@indiadeals.com
FROM_NAME=IndiaDeals
FRONTEND_URL=http://localhost:5174
```

**Step 3: Restart Server**
```bash
npm run dev
```

**Advantages of Mailtrap:**
- ✅ No real emails sent (safe for testing)
- ✅ View emails in web interface
- ✅ Test HTML rendering
- ✅ Check spam score
- ✅ No spam folder issues

---

### Option 3: Use Ethereal (Instant, No Signup)

Ethereal creates temporary email accounts instantly.

**Step 1: Generate Test Account**
```bash
cd backend
node -e "
const nodemailer = require('nodemailer');
nodemailer.createTestAccount((err, account) => {
  console.log('SMTP_HOST=smtp.ethereal.email');
  console.log('SMTP_PORT=587');
  console.log('SMTP_USER=' + account.user);
  console.log('SMTP_PASS=' + account.pass);
  console.log('\\nView emails at: https://ethereal.email/login');
  console.log('Username:', account.user);
  console.log('Password:', account.pass);
});
"
```

**Step 2: Copy Credentials to `.env`**
```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=<generated-user>
SMTP_PASS=<generated-pass>
FROM_EMAIL=noreply@indiadeals.com
FROM_NAME=IndiaDeals
FRONTEND_URL=http://localhost:5174
```

---

## Testing Each Email Type

### 1. Test Email Service Connection

First, verify your SMTP configuration is working:

**Create Test Script:** `backend/test-email.js`
```javascript
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send test email
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: process.env.SMTP_USER, // Send to yourself
      subject: '✅ Test Email from IndiaDeals',
      text: 'If you receive this, your email configuration is working!',
      html: '<h1>✅ Success!</h1><p>Your email configuration is working correctly.</p>',
    });

    console.log('✅ Test email sent!');
    console.log('Message ID:', info.messageId);

    // For Ethereal, show preview URL
    if (info.messageId.includes('@ethereal.email')) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

testEmail();
```

**Run Test:**
```bash
cd backend
node test-email.js
```

**Expected Output:**
```
✅ SMTP connection successful!
✅ Test email sent!
Message ID: <abc123@gmail.com>
```

---

### 2. Test Password Reset Email

**Method 1: Using API (Recommended)**

```bash
# Step 1: Create a test user (if not already exists)
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!@#"
  }'

# Step 2: Request password reset
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# Response:
# {
#   "message": "If an account with that email exists, a password reset link has been sent."
# }
```

**Step 3: Check Your Email**
- Gmail: Check inbox/spam
- Mailtrap: Go to https://mailtrap.io/inboxes
- Ethereal: Go to https://ethereal.email/messages

**Expected Email:**
```
Subject: Reset Your Password - IndiaDeals

Body:
Hi there,

We received a request to reset your password for your IndiaDeals account.

[Reset Password Button]

Or copy this link: http://localhost:5174/reset-password?token=abc123...

This link will expire in 1 hour.
```

**Step 4: Test the Reset Link**
1. Click the link or copy token
2. Go to: `http://localhost:5174/reset-password?token=<token-from-email>`
3. Enter new password
4. Submit

**Verify Reset Works:**
```bash
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token-from-email>",
    "password": "NewPassword123!@#"
  }'

# Response:
# { "message": "Password has been reset successfully" }
```

---

### 3. Test Email Verification

**Step 1: Create New User**
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "username": "newuser",
    "password": "Test123!@#"
  }'
```

**Step 2: Request Verification Email**
```bash
# First, login to get token
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Test123!@#"
  }' | jq -r '.accessToken')

# Then request verification
curl -X POST http://localhost:3001/api/auth/send-verification \
  -H "Authorization: Bearer $TOKEN"

# Response:
# { "message": "Verification email sent" }
```

**Step 3: Check Email**

**Expected Email:**
```
Subject: Verify Your Email - IndiaDeals

Body:
Welcome to IndiaDeals!

Please verify your email address by clicking the link below:

[Verify Email Button]

Or copy this link: http://localhost:5174/verify-email?token=xyz789...

This link will expire in 24 hours.
```

**Step 4: Verify the Email**
```bash
curl -X POST http://localhost:3001/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token-from-email>"
  }'

# Response:
# { "message": "Email verified successfully" }
```

---

### 4. Test Deal Alert Notifications 🔔

**Step 1: Create an Alert**
```bash
# Login first
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }' | jq -r '.accessToken')

# Create alert for "laptop" keyword
curl -X POST http://localhost:3001/api/alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "laptop",
    "minDiscount": 10,
    "maxPrice": 10000000,
    "frequency": "instant"
  }'

# Response:
# {
#   "alert": { ... },
#   "message": "Alert created! You'll receive instant notifications for \"laptop\""
# }
```

**Step 2: Post a Matching Deal**
```bash
# Post a deal that matches the alert
curl -X POST http://localhost:3001/api/deals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Amazing Laptop Deal - 20% OFF!",
    "description": "Dell XPS 13 at incredible price",
    "price": 7999900,
    "originalPrice": 9999900,
    "merchant": "Amazon",
    "url": "https://amazon.in/example",
    "imageUrl": "https://via.placeholder.com/400x300"
  }'

# Response:
# { "id": "...", "title": "Amazing Laptop Deal - 20% OFF!", ... }
```

**Step 3: Check Email (Should Arrive Within Seconds!)**

**Expected Email:**
```
Subject: 🔥 Deal Alert: Amazing Laptop Deal - 20% OFF! - ₹79,999

Body:
🔔 New Deal Alert!
Matching your alert: "laptop"

[Product Image]

Amazing Laptop Deal - 20% OFF!
Dell XPS 13 at incredible price

₹79,999  ₹99,999  20% OFF

Merchant: Amazon

[View Deal Button]

---
You're receiving this because you subscribed to alerts for "laptop".
Unsubscribe from this alert | Manage all alerts
```

---

## Testing Email HTML Rendering

### Check How Emails Look

**Gmail:**
- Open email
- Click "..." → "Show original"
- View HTML source

**Mailtrap:**
1. Open email in Mailtrap
2. Click "HTML Check" tab
3. See HTML/CSS analysis
4. Click "Spam Check" tab to see spam score

**Ethereal:**
1. Open email
2. View in browser
3. Check HTML rendering

---

## Common Issues & Solutions

### Issue 1: "Authentication Failed" Error

**Symptoms:**
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solutions:**

**For Gmail:**
1. Make sure you're using App Password, NOT your regular password
2. Enable "Less secure app access" (not recommended) OR use App Password
3. Check that 2FA is enabled

**For Mailtrap:**
1. Double-check username and password from Mailtrap dashboard
2. Make sure you're using "Email Testing" inbox, not "Email Sending"

**For Ethereal:**
1. Generate new credentials (they expire)
2. Copy credentials exactly as shown

---

### Issue 2: Emails Go to Spam

**Solutions:**

1. **Add SPF Record** (for production):
```
TXT record: v=spf1 include:_spf.google.com ~all
```

2. **Use SendGrid** (for production):
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>
```

3. **Test Spam Score** (Mailtrap):
- Open email in Mailtrap
- Click "Spam Analysis"
- Fix issues shown

---

### Issue 3: Emails Not Arriving

**Debug Steps:**

**Step 1: Check Server Logs**
```bash
cd backend
tail -f logs/combined.log | grep -i email
```

**Step 2: Test SMTP Connection**
```bash
node test-email.js
```

**Step 3: Check Environment Variables**
```bash
cd backend
echo "SMTP_HOST: $SMTP_HOST"
echo "SMTP_PORT: $SMTP_PORT"
echo "SMTP_USER: $SMTP_USER"
echo "FROM_EMAIL: $FROM_EMAIL"
```

**Step 4: Check if Email Service Started**
```bash
# In your server logs, you should see:
# ✅ Email service connected successfully
# OR
# ⚠️  Email service not configured - SMTP credentials missing
```

---

### Issue 4: Links in Email Don't Work

**Problem:** Links point to wrong URL

**Solution:** Check `FRONTEND_URL` in `.env`
```env
# Development
FRONTEND_URL=http://localhost:5174

# Production
FRONTEND_URL=https://yourdomain.com
```

---

## Advanced Testing

### Test Email Template Rendering

**Create HTML Test File:** `backend/test-email-template.js`
```javascript
import { sendAlertEmail } from './src/services/email.service.js';

const testAlert = {
  keyword: 'sony headphones',
  id: 'test-alert-id',
};

const testDeal = {
  title: 'Sony WH-1000XM5 Headphones - 25% OFF',
  description: 'Premium noise cancelling headphones with exceptional sound quality',
  price: 1999900, // ₹19,999
  originalPrice: 2666600, // ₹26,666
  discountPercentage: 25,
  merchant: 'Amazon',
  url: 'https://amazon.in/example',
  imageUrl: 'https://m.media-amazon.com/images/I/example.jpg',
};

sendAlertEmail('your-email@example.com', testAlert, testDeal)
  .then(() => console.log('✅ Email sent!'))
  .catch(err => console.error('❌ Error:', err));
```

**Run:**
```bash
node test-email-template.js
```

---

### Test All Email Types at Once

**Create:** `backend/test-all-emails.js`
```javascript
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendAlertEmail
} from './src/services/email.service.js';

const TEST_EMAIL = 'your-email@example.com';

async function testAllEmails() {
  console.log('Testing all email types...\n');

  // 1. Password Reset
  console.log('1. Sending password reset email...');
  await sendPasswordResetEmail(TEST_EMAIL, 'test-reset-token-123');
  console.log('✅ Password reset email sent\n');

  // 2. Email Verification
  console.log('2. Sending verification email...');
  await sendVerificationEmail(TEST_EMAIL, 'test-verify-token-456');
  console.log('✅ Verification email sent\n');

  // 3. Welcome Email
  console.log('3. Sending welcome email...');
  await sendWelcomeEmail(TEST_EMAIL, 'TestUser');
  console.log('✅ Welcome email sent\n');

  // 4. Deal Alert
  console.log('4. Sending deal alert...');
  await sendAlertEmail(
    TEST_EMAIL,
    { keyword: 'laptop', id: 'test-alert' },
    {
      title: 'Amazing Laptop - 30% OFF',
      description: 'High-performance laptop at unbeatable price',
      price: 4999900,
      originalPrice: 7142700,
      discountPercentage: 30,
      merchant: 'Flipkart',
      url: 'https://flipkart.com/example',
      imageUrl: 'https://via.placeholder.com/400x300',
    }
  );
  console.log('✅ Deal alert sent\n');

  console.log('🎉 All emails sent! Check your inbox.');
}

testAllEmails().catch(console.error);
```

**Run:**
```bash
node test-all-emails.js
```

**Expected Output:**
```
Testing all email types...

1. Sending password reset email...
✅ Password reset email sent

2. Sending verification email...
✅ Verification email sent

3. Sending welcome email...
✅ Welcome email sent

4. Sending deal alert...
✅ Deal alert sent

🎉 All emails sent! Check your inbox.
```

---

## Production Email Setup (SendGrid)

For production, use SendGrid (100 emails/day free):

**Step 1: Create SendGrid Account**
1. Go to https://sendgrid.com
2. Sign up for free account
3. Complete sender verification

**Step 2: Create API Key**
1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name it "IndiaDeals Production"
4. Select "Full Access"
5. Copy the API key (starts with `SG.`)

**Step 3: Verify Sender Email**
1. Go to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Enter your email (e.g., noreply@yourdomain.com)
4. Verify the email

**Step 4: Update Production `.env`**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=IndiaDeals
FRONTEND_URL=https://yourdomain.com
```

**Step 5: Test SendGrid**
```bash
node test-email.js
```

---

## Email Monitoring

### Track Email Delivery

**SendGrid Dashboard:**
- View sent emails
- Track opens/clicks
- See bounce rates
- Monitor spam reports

**Mailtrap Analytics:**
- Email count
- HTML/CSS issues
- Spam score
- Rendering previews (40+ email clients)

---

## Troubleshooting Checklist

- [ ] SMTP credentials are correct
- [ ] `.env` file is loaded (`console.log(process.env.SMTP_HOST)`)
- [ ] Server restarted after `.env` changes
- [ ] `FRONTEND_URL` is correct
- [ ] Email not in spam folder
- [ ] For Gmail: Using App Password (not regular password)
- [ ] For Gmail: 2FA is enabled
- [ ] Firewall allows outbound port 587
- [ ] Check server logs: `tail -f logs/combined.log`

---

## Quick Reference

### Environment Variables
```env
# Required
SMTP_HOST=smtp.gmail.com          # SMTP server
SMTP_PORT=587                      # SMTP port (usually 587 or 465)
SMTP_USER=your-email@gmail.com    # SMTP username
SMTP_PASS=your-app-password       # SMTP password

# Optional
FROM_EMAIL=noreply@domain.com     # Sender email
FROM_NAME=IndiaDeals              # Sender name
FRONTEND_URL=http://localhost:5174 # Frontend URL for links
```

### Test Commands
```bash
# Test SMTP connection
node test-email.js

# Test all email types
node test-all-emails.js

# View server logs
tail -f logs/combined.log | grep -i email

# Test password reset via API
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## Next Steps

Once emails are working:

1. **Test All Flows**
   - [ ] Password reset flow (request → email → reset)
   - [ ] Email verification flow (signup → verify → welcome)
   - [ ] Alert notification (create alert → post deal → email)

2. **Test Email Rendering**
   - [ ] Check on Gmail
   - [ ] Check on Outlook
   - [ ] Check on mobile devices
   - [ ] Use Mailtrap's "HTML Check"

3. **Production Setup**
   - [ ] Set up SendGrid
   - [ ] Add SPF/DKIM records
   - [ ] Test from production server
   - [ ] Monitor delivery rates

---

**Last Updated**: December 14, 2025
**Status**: Ready for Testing ✅
