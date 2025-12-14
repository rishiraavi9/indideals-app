# IndiaDeals Mobile App - Complete Setup Guide

Your mobile app is now configured and ready! This guide explains how to build and deploy your Android and iOS apps.

## What's Been Set Up

✅ **Capacitor 6** installed and configured
✅ **Android project** created with optimized build settings
✅ **iOS project** created with proper permissions
✅ **Native features** integrated (push notifications, sharing, haptics)
✅ **GitHub Actions** workflow for automated Android builds
✅ **Build scripts** added to package.json

---

## Quick Start Commands

All commands should be run from the `frontend` directory:

```bash
cd frontend

# Build web app and sync to mobile platforms
npm run build:mobile

# Open Android project in Android Studio (if you have it installed)
npm run cap:open:android

# Open iOS project in Xcode (if you have it installed - Mac only)
npm run cap:open:ios

# Sync web assets to mobile platforms
npm run cap:sync
```

---

## 🤖 Android Build (FREE - No Android Studio Required!)

### Option 1: GitHub Actions (RECOMMENDED - Completely Automated)

Your repository now has a GitHub Actions workflow that automatically builds Android APKs whenever you push code.

#### Setup Steps:

1. **Push this code to GitHub**:
   ```bash
   git add .
   git commit -m "Add mobile app configuration"
   git push
   ```

2. **Watch the build**:
   - Go to your GitHub repository
   - Click "Actions" tab
   - You'll see "Build Android APK/AAB" workflow running
   - Wait ~5 minutes for the build to complete

3. **Download your APK**:
   - Click on the completed workflow run
   - Scroll to "Artifacts" section at the bottom
   - Download `indideals-debug-XXX.apk`
   - Install on your Android device!

#### Manual Builds (On-Demand):

You can also trigger builds manually:

1. Go to GitHub → Actions → "Build Android APK/AAB"
2. Click "Run workflow"
3. Choose "debug" or "release"
4. Click "Run workflow" button
5. Download APK from artifacts after ~5 minutes

### Option 2: Local Build (Requires Android Studio)

If you want to build locally (only do this if you need to):

1. **Install Android Studio**:
   - Download from: https://developer.android.com/studio
   - Install with default settings
   - Open Android Studio and complete setup wizard

2. **Open project**:
   ```bash
   npm run cap:open:android
   ```

3. **Build APK**:
   - In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
   - Wait for build to complete
   - Click "locate" to find the APK file
   - Transfer to Android device and install

---

## 🍎 iOS Build (Requires Mac or Cloud Service)

### Option 1: Cloud Build Service (RECOMMENDED - No Mac Required)

Use **Expo Application Services (EAS)** to build iOS apps in the cloud:

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS**:
   ```bash
   eas build:configure
   ```

4. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```

5. **Download IPA**:
   - EAS will provide a download link
   - Use Apple Configurator or Xcode to install on device

**Cost**: $29/month for unlimited builds

### Option 2: Local Build (Requires Mac + Xcode)

If you have a Mac:

1. **Install Xcode**:
   - Download from Mac App Store
   - Open Xcode and accept license agreement

2. **Open project**:
   ```bash
   npm run cap:open:ios
   ```

3. **Configure signing**:
   - In Xcode, select "App" target
   - Go to "Signing & Capabilities"
   - Select your Apple Developer Team
   - Xcode will automatically create provisioning profiles

4. **Build and run**:
   - Connect iPhone via USB
   - Select your device from top toolbar
   - Click ▶️ Run button
   - App will install on your iPhone

---

## 📱 Testing on Physical Devices

### Android

1. **Enable Developer Mode**:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options
   - Enable "USB Debugging"

2. **Install APK**:
   - Download APK from GitHub Actions artifacts
   - Transfer to phone (email, Dropbox, USB, etc.)
   - Open APK file on phone
   - Tap "Install" (may need to enable "Install from unknown sources")

3. **Test the app**:
   - All features should work except push notifications (requires Firebase setup)

### iOS

1. **Install via Xcode** (Mac only):
   - Connect iPhone via USB
   - Trust computer on iPhone
   - Open Xcode project
   - Select your device
   - Click Run

2. **Install via TestFlight**:
   - Upload IPA to App Store Connect
   - Add testers to TestFlight
   - Testers download TestFlight app
   - Install IndiaDeals from TestFlight

---

## 🔧 Native Features Integration

Your app now supports these native features:

### 1. Push Notifications

**Setup Required**:
- Android: Firebase Cloud Messaging (FCM) setup needed
- iOS: Apple Push Notification service (APNs) setup needed

**Code already integrated**: See [src/utils/capacitor.ts](frontend/src/utils/capacitor.ts:91-134)

### 2. Share Dialog

Share deals with native share sheet:

```typescript
import { shareContent } from '@/utils/capacitor';

shareContent({
  title: 'Check out this deal!',
  text: 'Sony WH-1000XM4 for ₹19,999',
  url: 'https://indideals.com/deal/123'
});
```

### 3. Haptic Feedback

Vibrate on button taps:

```typescript
import { triggerHaptic } from '@/utils/capacitor';

triggerHaptic('medium'); // 'light', 'medium', or 'heavy'
```

### 4. Status Bar

Status bar is automatically styled to match your app theme (blue background).

### 5. Splash Screen

Splash screen shows for 2 seconds on app launch with your brand color.

---

## 🚀 Publishing to App Stores

### Google Play Store (Android)

1. **Create Google Play Console account**:
   - Go to: https://play.google.com/console
   - Pay $25 one-time registration fee

2. **Generate release keystore**:
   ```bash
   keytool -genkey -v -keystore release.keystore \
     -alias indideals -keyalg RSA -keysize 2048 -validity 10000
   ```

3. **Add secrets to GitHub**:
   - Go to GitHub → Settings → Secrets → Actions
   - Add these secrets:
     - `RELEASE_STORE_FILE`: Base64 of release.keystore
     - `RELEASE_STORE_PASSWORD`: Your keystore password
     - `RELEASE_KEY_ALIAS`: indideals
     - `RELEASE_KEY_PASSWORD`: Your key password

4. **Build release AAB**:
   - GitHub Actions → Run workflow → Select "release"
   - Download AAB from artifacts

5. **Upload to Play Console**:
   - Create app in Play Console
   - Upload AAB file
   - Fill in app details, screenshots, description
   - Submit for review (~3-7 days)

### Apple App Store (iOS)

1. **Join Apple Developer Program**:
   - Go to: https://developer.apple.com
   - Enroll ($99/year)

2. **Create App Store Connect app**:
   - Go to: https://appstoreconnect.apple.com
   - Click "+" → New App
   - Fill in app information
   - Bundle ID: `com.indideals.app`

3. **Build with Xcode** (or use EAS):
   - Open project in Xcode
   - Product → Archive
   - Distribute App → App Store Connect
   - Upload to App Store

4. **Submit for review**:
   - Fill in app details in App Store Connect
   - Add screenshots (use iPhone 15 Pro Max)
   - Submit for review (~24-48 hours)

---

## 🔑 Firebase Setup (for Push Notifications)

### Android FCM Setup

1. **Create Firebase project**:
   - Go to: https://console.firebase.google.com
   - Click "Add project"
   - Name: IndiaDeals

2. **Add Android app**:
   - Click "Add app" → Android
   - Package name: `com.indideals.app`
   - Download `google-services.json`
   - Place in `frontend/android/app/google-services.json`

3. **Get FCM server key**:
   - Project Settings → Cloud Messaging
   - Copy "Server key"
   - Add to backend environment variables:
     ```bash
     FCM_SERVER_KEY=your-server-key-here
     ```

4. **Rebuild app**:
   ```bash
   npm run build:mobile
   ```

### iOS APNs Setup

1. **Create APNs key**:
   - Go to: https://developer.apple.com/account/resources/authkeys
   - Create new key with "Apple Push Notifications service (APNs)"
   - Download `.p8` file

2. **Add to Firebase**:
   - Firebase Console → Project Settings → Cloud Messaging
   - Upload APNs key
   - Enter Team ID and Key ID

3. **Enable Push in Xcode**:
   - Open project in Xcode
   - Select "App" target
   - Signing & Capabilities → "+ Capability" → Push Notifications

---

## 🔄 Updating Your App

After making changes to your React code:

1. **Build and sync**:
   ```bash
   cd frontend
   npm run build:mobile
   ```

2. **Android**: GitHub Actions will automatically build when you push

3. **iOS**: Re-run Xcode build or EAS build

---

## 📊 Build Artifacts

### Debug Builds (for testing)
- **Android**: `app-debug.apk` (~50-80 MB)
- **iOS**: Not available without Xcode

### Release Builds (for stores)
- **Android**: `app-release.aab` (~20-40 MB, optimized)
- **iOS**: `App.ipa` (~30-50 MB, optimized)

---

## 🐛 Troubleshooting

### "Build failed" on GitHub Actions

**Check the error logs**:
- Click on the failed workflow
- Expand the failed step
- Common issues:
  - Missing dependencies: `npm ci` failed
  - TypeScript errors: Fix in your code
  - Gradle errors: Check `android/app/build.gradle`

### APK won't install on Android

**Solutions**:
- Enable "Install from unknown sources"
- Uninstall previous version first
- Check Android version (requires Android 7.0+)

### Capacitor plugin errors

**Fix**:
```bash
cd frontend
npm run cap:sync
```

### Native features not working on web

**Expected**: Native features only work on iOS/Android
- Check with `isNativePlatform()` before calling
- Provide web fallbacks (e.g., Web Share API)

---

## 📚 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio Download](https://developer.android.com/studio)
- [Xcode Download](https://developer.apple.com/xcode/)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Firebase Console](https://console.firebase.google.com)

---

## 🎯 Next Steps

1. **Test locally**: Use GitHub Actions to build your first APK
2. **Test on device**: Install APK on your Android phone
3. **Set up Firebase**: Enable push notifications
4. **Customize**: Add app icons and splash screens
5. **Publish**: Submit to Google Play Store

---

## 💡 Pro Tips

1. **Use debug builds for testing**: They install alongside release builds
2. **Test on real devices**: Emulators don't support all native features
3. **Version your builds**: GitHub Actions automatically numbers them
4. **Keep keystores safe**: Back up your release keystore securely
5. **Monitor builds**: GitHub will email you when builds complete

---

## ✅ What You Can Do RIGHT NOW

Without installing anything, you can:

1. Push code to GitHub
2. Wait 5 minutes for GitHub Actions to build APK
3. Download APK from artifacts
4. Install on any Android device
5. Test your app!

**Ready to try it?**

```bash
# From the root of your project
git add .
git commit -m "feat: Add mobile app with Capacitor"
git push

# Then go to GitHub → Actions and watch the magic happen! 🎉
```
