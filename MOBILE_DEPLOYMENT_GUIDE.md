# Mobile Deployment Guide - Capacitor

**Last Updated**: December 14, 2025
**Target Platforms**: iOS (App Store) & Android (Google Play)
**Approach**: Capacitor 6 - Hybrid Native Apps

---

## Overview

This guide walks you through deploying IndiaDeals to iOS App Store and Google Play Store using Capacitor, which wraps your existing React web app into native mobile apps.

**Why Capacitor:**
- ✅ Reuse 95% of existing React code
- ✅ Deploy to both iOS and Android
- ✅ Access native features (push notifications, camera, biometrics)
- ✅ Quick setup (1-2 weeks to app stores)
- ✅ Single codebase for web + mobile

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Android Deployment](#android-deployment)
4. [iOS Deployment](#ios-deployment)
5. [Native Features](#native-features)
6. [App Store Submission](#app-store-submission)
7. [Maintenance](#maintenance)

---

## Prerequisites

### Required Software

**For Both Platforms:**
- Node.js 18+ (already have)
- Git (already have)
- Your React app (already built)

**For Android:**
- [Android Studio](https://developer.android.com/studio) (latest version)
- Java Development Kit (JDK) 17+

**For iOS (Mac only):**
- Xcode 15+ (from Mac App Store)
- macOS 13.0+ (Ventura or later)
- Apple Developer Account ($99/year)

**For Publishing:**
- [Google Play Developer Account](https://play.google.com/console) ($25 one-time)
- [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)

---

## Initial Setup

### Step 1: Install Capacitor

```bash
cd /Users/venkatarishikraavi/apps/deals-app/frontend

# Install Capacitor core and CLI
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init
```

**Prompts:**
- App name: `IndiaDeals`
- App ID: `com.indideals.app` (reverse domain notation)
- Web asset directory: `dist` (Vite's build output)

### Step 2: Update Capacitor Configuration

Create `frontend/capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.indideals.app',
  appName: 'IndiaDeals',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development, point to your local backend
    // url: 'http://10.0.2.2:3001', // Android emulator
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#2563eb',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#2563eb',
    },
  },
};

export default config;
```

### Step 3: Install Platform-Specific Packages

```bash
# Install Android
npm install @capacitor/android
npx cap add android

# Install iOS (Mac only)
npm install @capacitor/ios
npx cap add ios

# Install common plugins
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/app
npm install @capacitor/share
npm install @capacitor/haptics
npm install @capacitor/keyboard
npm install @capacitor/network
```

### Step 4: Update package.json Scripts

Add to `frontend/package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "cap:sync": "cap sync",
    "cap:sync:android": "cap sync android",
    "cap:sync:ios": "cap sync ios",
    "cap:open:android": "cap open android",
    "cap:open:ios": "cap open ios",
    "cap:run:android": "cap run android",
    "cap:run:ios": "cap run ios",
    "mobile:build": "npm run build && cap sync",
    "mobile:build:android": "npm run build && cap sync android",
    "mobile:build:ios": "npm run build && cap sync ios"
  }
}
```

### Step 5: Build Web App and Sync

```bash
# Build the React app
npm run build

# Sync web assets to native projects
npx cap sync
```

This copies your `dist` folder into:
- `android/app/src/main/assets/public`
- `ios/App/App/public`

---

## Android Deployment

### Step 1: Configure Android Project

**Update `android/app/build.gradle`:**

```gradle
android {
    namespace "com.indideals.app"
    compileSdk 34

    defaultConfig {
        applicationId "com.indideals.app"
        minSdk 22  // Android 5.1+ (covers 99% of devices)
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Update `android/app/src/main/AndroidManifest.xml`:**

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
                     android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                     android:maxSdkVersion="29" />

    <application
        android:label="IndiaDeals"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
        android:allowBackup="true"
        android:supportsRtl="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- Deep linking -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="indideals.com" />
                <data android:scheme="indideals" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### Step 2: Generate App Icons

Use [Icon Kitchen](https://icon.kitchen/) or create manually:

**Required Android Icons:**
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

**Adaptive Icons (Android 8.0+):**
- `android/app/src/main/res/drawable/ic_launcher_foreground.xml`
- `android/app/src/main/res/drawable/ic_launcher_background.xml`

### Step 3: Add Splash Screen

Create `android/app/src/main/res/drawable/splash.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background"/>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash_logo"/>
    </item>
</layer-list>
```

Add logo: `android/app/src/main/res/drawable/splash_logo.png` (512x512)

### Step 4: Build Android APK/AAB

**For Testing (APK):**

```bash
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

**For Google Play (AAB - Android App Bundle):**

```bash
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Step 5: Sign the App

**Generate Upload Keystore (First Time Only):**

```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload \
  -storepass YOUR_STRONG_PASSWORD \
  -keypass YOUR_STRONG_PASSWORD
```

**Store keystore info in `android/key.properties`:**

```properties
storePassword=YOUR_STRONG_PASSWORD
keyPassword=YOUR_STRONG_PASSWORD
keyAlias=upload
storeFile=../upload-keystore.jks
```

**Update `android/app/build.gradle`:**

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ...

    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ...
        }
    }
}
```

**Build signed AAB:**

```bash
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab (signed)
```

---

## iOS Deployment

### Step 1: Open Xcode Project

```bash
# From frontend directory
npx cap open ios
```

This opens `ios/App/App.xcworkspace` in Xcode.

### Step 2: Configure Project Settings

In Xcode:

1. **Select the App target** (not CapacitorCordova)
2. **General tab:**
   - Display Name: `IndiaDeals`
   - Bundle Identifier: `com.indideals.app`
   - Version: `1.0.0`
   - Build: `1`
   - Deployment Target: iOS 13.0+

3. **Signing & Capabilities:**
   - Team: Select your Apple Developer account
   - Automatically manage signing: ✅ Checked
   - Add capabilities:
     - Push Notifications
     - Background Modes → Remote notifications
     - Associated Domains (for deep links)

### Step 3: Add App Icons

**iOS requires multiple icon sizes:**

Use [App Icon Generator](https://appicon.co/) or Xcode Asset Catalog:

1. In Xcode: `ios/App/App/Assets.xcassets/AppIcon.appiconset`
2. Drag 1024x1024 PNG icon
3. Xcode generates all sizes automatically

**Required sizes:**
- 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024

### Step 4: Add Launch Screen (Splash)

Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard` in Xcode:

1. Add ImageView
2. Set image to `splash_logo` (add to Assets.xcassets)
3. Set background color: `#2563eb`
4. Center constraints

Or use Capacitor's splash plugin (already configured).

### Step 5: Configure Info.plist

Edit `ios/App/App/Info.plist`:

```xml
<dict>
    <key>CFBundleDisplayName</key>
    <string>IndiaDeals</string>

    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>

    <key>CFBundleVersion</key>
    <string>1</string>

    <!-- Privacy permissions -->
    <key>NSCameraUsageDescription</key>
    <string>Take photos to share deals</string>

    <key>NSPhotoLibraryUsageDescription</key>
    <string>Select photos to share deals</string>

    <!-- Deep linking -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>indideals</string>
            </array>
        </dict>
    </array>
</dict>
```

### Step 6: Build and Archive

**For Testing:**

```bash
# Run on simulator
npx cap run ios

# Or in Xcode: Product → Run (⌘R)
```

**For App Store:**

1. In Xcode: **Product → Archive** (⌘⇧B)
2. Wait for build to complete
3. Organizer window opens automatically
4. Select archive → **Distribute App**
5. Choose **App Store Connect**
6. Upload to Apple

---

## Native Features

### Enable Push Notifications

```bash
npm install @capacitor/push-notifications
npx cap sync
```

**Frontend code (`frontend/src/utils/push-notifications.ts`):**

```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const initPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications only work on native platforms');
    return;
  }

  // Request permission
  const permission = await PushNotifications.requestPermissions();

  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }

  // Listen for registration
  PushNotifications.addListener('registration', (token) => {
    console.log('Push token:', token.value);
    // Send token to your backend
    sendTokenToBackend(token.value);
  });

  // Listen for push notifications
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });

  // Listen for notification taps
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action:', notification);
    // Navigate to deal page
  });
};

const sendTokenToBackend = async (token: string) => {
  await fetch('https://your-backend.com/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
  });
};
```

**Call in App.tsx:**

```typescript
import { useEffect } from 'react';
import { initPushNotifications } from './utils/push-notifications';

export default function App() {
  useEffect(() => {
    initPushNotifications();
  }, []);

  // rest of app
}
```

### Native Sharing

Already implemented in your `CompactDealCard.tsx`! The Web Share API works natively in Capacitor.

### Haptic Feedback

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Light tap on upvote
const handleUpvote = async () => {
  await Haptics.impact({ style: ImpactStyle.Light });
  // ... voting logic
};
```

### Network Status

```typescript
import { Network } from '@capacitor/network';

const status = await Network.getStatus();
console.log('Network status:', status.connected);

Network.addListener('networkStatusChange', (status) => {
  console.log('Network changed:', status.connected);
  if (!status.connected) {
    showOfflineMessage();
  }
});
```

### App State

```typescript
import { App as CapApp } from '@capacitor/app';

// Listen for app going to background
CapApp.addListener('appStateChange', ({ isActive }) => {
  console.log('App active:', isActive);
  if (!isActive) {
    // Pause video, save state, etc.
  }
});

// Handle back button (Android)
CapApp.addListener('backButton', ({ canGoBack }) => {
  if (!canGoBack) {
    CapApp.exitApp();
  } else {
    window.history.back();
  }
});
```

---

## App Store Submission

### Google Play Store

**1. Create Google Play Developer Account:**
- Go to [Google Play Console](https://play.google.com/console)
- Pay $25 one-time fee
- Complete account setup

**2. Create App:**
- Click "Create app"
- App name: `IndiaDeals`
- Default language: English
- App/Game: App
- Free/Paid: Free

**3. Complete Store Listing:**

**Required:**
- **App name**: IndiaDeals
- **Short description** (80 chars):
  "Find and share the best deals in India. Save money on electronics, fashion & more!"
- **Full description** (4000 chars):
  ```
  IndiaDeals is India's largest community-driven deals platform. Find the hottest deals on electronics, fashion, home & kitchen, and more. Share deals you find and help others save money.

  Features:
  • Browse verified deals from top merchants
  • Search & filter by category
  • Save deals to your wishlist
  • Get price drop alerts
  • Share deals with friends
  • Upvote/downvote deals
  • Comment and discuss with community

  Join thousands of savvy shoppers and never miss a great deal again!
  ```
- **App icon**: 512x512 PNG (32-bit, no alpha)
- **Feature graphic**: 1024x500 PNG
- **Screenshots**:
  - Phone: 2-8 screenshots (min 320px, max 3840px)
  - Tablet: 2-8 screenshots (min 320px, max 3840px)
- **App category**: Shopping
- **Content rating**: Complete questionnaire (likely PEGI 3)
- **Target audience**: 18+

**4. Upload AAB:**
- Production → Create release
- Upload `app-release.aab`
- Release name: `1.0.0`
- Release notes:
  ```
  Initial release of IndiaDeals mobile app!

  Features:
  - Browse verified deals
  - Search and filter
  - Save to wishlist
  - Price alerts
  - Community voting and comments
  ```

**5. Submit for Review:**
- Review summary → Start rollout
- Review takes 1-3 days

### Apple App Store

**1. Enroll in Apple Developer Program:**
- Go to [Apple Developer](https://developer.apple.com/programs/)
- Pay $99/year
- Wait for approval (1-2 days)

**2. Create App in App Store Connect:**
- Go to [App Store Connect](https://appstoreconnect.apple.com)
- My Apps → ➕ New App
- Platform: iOS
- Name: IndiaDeals
- Primary Language: English
- Bundle ID: com.indideals.app
- SKU: indideals-001

**3. Complete App Information:**

**Required:**
- **Subtitle** (30 chars): "Best Deals & Discounts"
- **Description** (4000 chars): Same as Android
- **Keywords** (100 chars): "deals,discounts,shopping,save money,coupons,offers,india,electronics,fashion"
- **Support URL**: https://indideals.com/support
- **Privacy Policy URL**: https://indideals.com/privacy
- **Category**: Primary = Shopping, Secondary = Lifestyle
- **Age Rating**: 4+

**Screenshots:**
- 6.7" (iPhone 14 Pro Max): 1290x2796 (2-10 screenshots)
- 6.5" (iPhone 11 Pro Max): 1242x2688
- 5.5" (iPhone 8 Plus): 1242x2208

**App Preview (Optional):**
- 15-30 second video demo

**4. Build & Upload:**
- Archive in Xcode (already done)
- Upload to App Store Connect
- Select build in App Store Connect

**5. Submit for Review:**
- Add build to version
- Complete all sections
- Submit for review
- Review takes 1-3 days (sometimes up to 5)

**Common Rejection Reasons:**
- Missing privacy policy
- App crashes on launch
- Incomplete functionality
- Misleading screenshots

---

## Maintenance

### Updating the App

**1. Make changes to React app:**

```bash
cd frontend
# ... make changes ...
npm run build
```

**2. Sync to native projects:**

```bash
npx cap sync
```

**3. Increment version:**

**Android (`android/app/build.gradle`):**
```gradle
versionCode 2  // Increment by 1
versionName "1.0.1"
```

**iOS (Xcode):**
- Version: `1.0.1`
- Build: `2` (increment)

**4. Build and submit:**

```bash
# Android
cd android && ./gradlew bundleRelease

# iOS
# Archive in Xcode
```

### Adding Native Plugins

```bash
# Install plugin
npm install @capacitor/camera

# Sync
npx cap sync

# Update permissions in AndroidManifest.xml and Info.plist
```

### Testing

**Android:**
```bash
# Emulator
npx cap run android

# Real device (USB debugging enabled)
npx cap run android --target=DEVICE_ID
```

**iOS:**
```bash
# Simulator
npx cap run ios

# Real device (connected via USB)
# Select device in Xcode and run
```

---

## Troubleshooting

### Android

**Issue**: Build fails with "SDK not found"
**Fix**: Set `ANDROID_HOME` environment variable:
```bash
export ANDROID_HOME=/Users/YOUR_USER/Library/Android/sdk
```

**Issue**: App crashes on launch
**Fix**: Check `adb logcat` for errors:
```bash
adb logcat | grep IndiaDeals
```

### iOS

**Issue**: Code signing error
**Fix**:
- Xcode → Preferences → Accounts → Re-login
- Clean build folder (⌘⇧K)

**Issue**: App rejected for missing permissions
**Fix**: Add all `NS*UsageDescription` keys to Info.plist

---

## Estimated Timeline

| Task | Time |
|------|------|
| Capacitor setup | 4 hours |
| Android configuration | 4 hours |
| iOS configuration | 6 hours (Mac required) |
| Icon & splash screens | 4 hours |
| Testing on devices | 8 hours |
| Store listing creation | 4 hours |
| Review process | 2-5 days (each store) |
| **Total** | **1-2 weeks** |

---

## Costs

| Item | Cost |
|------|------|
| Google Play Developer Account | $25 (one-time) |
| Apple Developer Program | $99/year |
| Design tools (optional) | $0 (use free tools) |
| **Total First Year** | $124 |
| **Total Subsequent Years** | $99 |

---

## Next Steps

1. ✅ Install Android Studio / Xcode
2. ✅ Run initial Capacitor setup
3. ✅ Build and test on emulator
4. ✅ Create app icons and splash screens
5. ✅ Test on real devices
6. ✅ Create developer accounts
7. ✅ Submit to both stores
8. ✅ Monitor reviews and respond

---

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Play Store Review Guidelines](https://support.google.com/googleplay/android-developer/answer/9898842)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

**Questions? Issues?**
Document any problems in this repo's issues section for future reference.
