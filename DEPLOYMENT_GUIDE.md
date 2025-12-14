# Deployment Guide for IndiaDeals App

## 📱 Complete Deployment Strategy

### 1. Web Application (PWA)

#### A. Backend Deployment Options

##### **Railway.app (Recommended - Easiest)**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy backend
cd backend
railway login
railway init
railway up

# Add environment variables in Railway dashboard
# Get your production URL: https://your-app.railway.app
```

##### **Render.com (Free Tier)**
1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect GitHub repository
4. Configuration:
   - **Name**: indadeals-api
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**: Copy from `.env`

##### **Fly.io (Good for India)**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

cd backend
fly launch
fly deploy
```

#### B. Frontend Deployment

##### **Vercel (Best for React - Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

cd frontend
vercel

# Update VITE_API_URL in Vercel dashboard to your backend URL
```

##### **Netlify**
```bash
npm i -g netlify-cli

cd frontend
npm run build
netlify deploy --prod
```

#### C. Database (PostgreSQL)

##### **Neon.tech (Recommended - Free tier)**
1. Sign up at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Update `DATABASE_URL` in backend env

##### **Supabase (Alternative)**
1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from Settings → Database
3. Update `DATABASE_URL`

##### **Railway Postgres (If using Railway)**
```bash
railway add postgresql
# Connection string auto-added to env
```

#### D. Make it a PWA

1. Create `frontend/public/manifest.json`:
```json
{
  "name": "IndiaDeals - Best Deals in India",
  "short_name": "IndiaDeals",
  "description": "Discover and share the best deals in India",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#2676ff",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

2. Add to `frontend/index.html` in `<head>`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#2676ff">
<link rel="apple-touch-icon" href="/icon-192.png">
```

3. Create service worker `frontend/public/sw.js`:
```javascript
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (event) => {
  // Add caching strategy here if needed
});
```

4. Register service worker in `frontend/src/main.tsx`:
```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

---

### 2. iOS App (App Store)

#### Option A: Capacitor (Easiest - Wraps your React app)

##### Prerequisites
- Mac with macOS
- Xcode 14+ installed from App Store
- Apple Developer Account ($99/year)
- CocoaPods: `sudo gem install cocoapods`

##### Setup
```bash
cd frontend

# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Initialize Capacitor
npx cap init

# When prompted:
# App name: IndiaDeals
# App ID: com.yourcompany.indiadeals (reverse domain)
# Web dir: dist

# Build your React app
npm run build

# Add iOS platform
npx cap add ios

# Open in Xcode
npx cap open ios
```

##### Configure in Xcode
1. Select your project → General
2. **Display Name**: IndiaDeals
3. **Bundle Identifier**: com.yourcompany.indiadeals
4. **Version**: 1.0.0
5. **Team**: Select your Apple Developer account
6. Add app icons (1024x1024 required)
7. Configure capabilities: Push Notifications, etc.

##### Update API URL for Production
Edit `frontend/capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.indiadeals',
  appName: 'IndiaDeals',
  webDir: 'dist',
  server: {
    url: 'https://your-api.railway.app', // Your production API
    cleartext: true
  }
};

export default config;
```

##### Build & Submit
```bash
# After making changes to web code
npm run build
npx cap sync ios
npx cap open ios

# In Xcode:
# 1. Select "Any iOS Device" as target
# 2. Product → Archive
# 3. Distribute App → App Store Connect
# 4. Upload
```

##### App Store Connect Setup
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. My Apps → + → New App
3. Fill in:
   - **Platform**: iOS
   - **Name**: IndiaDeals
   - **Primary Language**: English (India)
   - **Bundle ID**: com.yourcompany.indiadeals
   - **SKU**: INDIADEALS001
4. Add screenshots (required sizes):
   - 6.7" Display: 1290 x 2796
   - 6.5" Display: 1242 x 2688
   - 5.5" Display: 1242 x 2208
5. Write App Description, Keywords
6. Select Category: Shopping
7. Add Privacy Policy URL
8. Submit for Review

#### Option B: React Native (Full Native App)
```bash
npx react-native init IndiaDeals
# Then rebuild UI using React Native components
# More work but better performance
```

---

### 3. Android App (Play Store)

#### Option A: Capacitor (Easiest)

##### Prerequisites
- Android Studio installed
- Java JDK 11+
- Google Play Developer account ($25 one-time)

##### Setup
```bash
cd frontend

# Add Android platform
npx cap add android

# Open in Android Studio
npx cap open android
```

##### Configure in Android Studio
1. Update `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        applicationId "com.yourcompany.indiadeals"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
}
```

2. Add app icon: `android/app/src/main/res/`
   - Use Android Studio → New → Image Asset
   - Upload 512x512 icon

3. Update `android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">IndiaDeals</string>
    <string name="title_activity_main">IndiaDeals</string>
</resources>
```

##### Generate Signed APK/AAB
1. Build → Generate Signed Bundle/APK
2. Choose **Android App Bundle** (AAB)
3. Create new keystore:
   - **Key store path**: Choose location
   - **Password**: Create strong password
   - **Alias**: indiadeals-key
   - **Validity**: 25 years
   - **Save keystore details securely!**
4. Build release AAB

##### Play Store Submission
1. Go to [play.google.com/console](https://play.google.com/console)
2. Create App → Fill details:
   - **App Name**: IndiaDeals
   - **Default Language**: English (India)
   - **App/Game**: App
   - **Free/Paid**: Free
3. Store Listing:
   - Add 2-8 screenshots
   - High-res icon (512x512)
   - Feature graphic (1024x500)
   - Short description (80 chars)
   - Full description (4000 chars)
4. Content Rating Questionnaire
5. Target Audience
6. Upload AAB to Production track
7. Submit for Review

##### Update API URL
Edit `frontend/capacitor.config.ts` (same as iOS)

##### Sync changes
```bash
npm run build
npx cap sync android
npx cap open android
```

#### Option B: Expo (If rebuilding in React Native)
```bash
npx create-expo-app IndiaDeals
expo build:android
```

---

### 4. Domain & SSL

#### Buy Domain
- **Namecheap**: indiadeals.com
- **GoDaddy**
- **Google Domains**

#### Configure DNS
Point domain to your hosting:
- **Vercel**: Add custom domain in dashboard
- **Netlify**: Add custom domain in dashboard
- **Railway**: Add custom domain in settings

SSL certificates are auto-provisioned by hosting providers.

---

### 5. Essential Configuration

#### Environment Variables

**Backend Production `.env`:**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@neon.tech/db
JWT_SECRET=generate-long-random-string-here
FRONTEND_URL=https://indiadeals.com

# OAuth (Setup on respective platforms)
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-secret

# Cloudinary (for images)
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
```

**Frontend Production:**
```env
VITE_API_URL=https://api.indiadeals.com
```

#### Security Checklist
- [ ] Change JWT_SECRET to strong random string
- [ ] Enable CORS only for your domain
- [ ] Set up rate limiting
- [ ] Add Helmet.js for security headers
- [ ] Enable HTTPS everywhere
- [ ] Set secure cookie flags
- [ ] Sanitize all user inputs

---

### 6. Continuous Deployment

#### GitHub Actions for Auto-Deploy

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npm i -g @railway/cli
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: |
          npm i -g vercel
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

### 7. Monitoring & Analytics

#### Free Tools
- **Sentry**: Error tracking
- **Google Analytics**: User analytics
- **Vercel Analytics**: Web vitals
- **PostHog**: Product analytics

#### Add to Frontend
```bash
npm install @sentry/react
```

```typescript
// frontend/src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production"
});
```

---

### 8. Cost Estimate (Monthly)

#### Minimal Setup (Free tier)
- **Frontend**: Vercel (Free)
- **Backend**: Render (Free, sleeps after 15min inactivity)
- **Database**: Neon (Free, 3GB)
- **Total**: $0/month

#### Recommended Setup
- **Frontend**: Vercel Pro ($20)
- **Backend**: Railway ($5-10)
- **Database**: Railway Postgres ($5)
- **Domain**: $1/month
- **Cloudinary**: Free tier
- **Total**: ~$30-40/month

#### Scale Setup (10K+ users)
- **Frontend**: Vercel Pro ($20)
- **Backend**: Railway/DigitalOcean ($20-50)
- **Database**: Dedicated ($20-50)
- **CDN**: Cloudflare (Free)
- **Total**: ~$60-120/month

#### Mobile Only Costs
- **Apple Developer**: $99/year
- **Google Play**: $25 one-time
- **Total First Year**: $124

---

### 9. Pre-Launch Checklist

#### Technical
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] SSL certificates active
- [ ] API rate limiting enabled
- [ ] Error monitoring configured
- [ ] Analytics installed
- [ ] Mobile apps tested on physical devices
- [ ] PWA install prompt working
- [ ] Push notifications configured (if applicable)

#### Legal & Compliance
- [ ] Privacy Policy written
- [ ] Terms of Service written
- [ ] Cookie consent banner (if in EU)
- [ ] Data retention policy
- [ ] GDPR compliance (if applicable)
- [ ] Age restriction compliance

#### App Store Requirements
- [ ] App icons (all sizes)
- [ ] Screenshots (all required sizes)
- [ ] App description optimized
- [ ] Keywords researched
- [ ] Support URL/email
- [ ] Privacy policy URL
- [ ] Content rating completed
- [ ] Age rating appropriate

#### Marketing
- [ ] Landing page ready
- [ ] Social media accounts
- [ ] App Store optimization (ASO)
- [ ] Beta testers recruited
- [ ] Launch announcement prepared

---

### 10. Launch Steps

#### Week 1: Soft Launch
1. Deploy web app (Vercel + Railway)
2. Test with 10-20 beta users
3. Fix critical bugs

#### Week 2: Mobile Beta
1. TestFlight (iOS) - Invite 100 testers
2. Google Play Beta - Invite testers
3. Collect feedback
4. Iterate

#### Week 3: Public Web Launch
1. Announce on Product Hunt
2. Share on social media
3. Monitor error rates
4. Scale infrastructure if needed

#### Week 4: App Store Launch
1. Submit iOS to App Store
2. Submit Android to Play Store
3. Typical approval: 1-3 days (Apple), 1-2 days (Google)
4. Announce when approved

---

### 11. Quick Start Commands

```bash
# 1. Deploy database
neon.tech signup → Create project → Copy connection string

# 2. Deploy backend
cd backend
railway login
railway init
railway up
# Add env vars in Railway dashboard

# 3. Deploy frontend
cd frontend
vercel
# Add VITE_API_URL in Vercel dashboard

# 4. Build iOS app
cd frontend
npm run build
npx cap sync ios
npx cap open ios
# Archive in Xcode

# 5. Build Android app
npm run build
npx cap sync android
npx cap open android
# Generate Signed Bundle

# 6. Monitor
# Check Railway logs
# Check Vercel analytics
# Check Sentry errors
```

---

### 12. Common Issues & Solutions

#### CORS Errors
```typescript
// backend/src/index.ts
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

#### Mobile App Blank Screen
- Check if API URL is correct in capacitor.config
- Run `npx cap sync` after changes
- Check network tab in Safari Web Inspector (iOS)

#### Database Connection Failed
- Check DATABASE_URL format
- Ensure SSL mode: `?sslmode=require`
- Whitelist Railway IPs in Neon

#### App Store Rejection
- Common: Missing privacy policy
- Common: App crashes on launch
- Common: Incomplete metadata
- Test thoroughly before submission

---

### Support Resources
- **Capacitor Docs**: https://capacitorjs.com
- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Apple Review Guidelines**: https://developer.apple.com/app-store/review/guidelines
- **Google Play Policies**: https://play.google.com/about/developer-content-policy

### Contact
For issues specific to this deployment, check:
1. Railway logs for backend errors
2. Vercel deployment logs for frontend
3. Xcode console for iOS issues
4. Android Studio logcat for Android issues
