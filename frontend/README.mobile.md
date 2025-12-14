# IndiaDeals Mobile App

This directory contains the Capacitor mobile app configuration for IndiaDeals.

## Quick Start

```bash
# Build and sync to mobile platforms
npm run build:mobile

# Use the helper script (interactive menu)
./mobile-dev.sh

# Or use specific commands
./mobile-dev.sh build-sync
./mobile-dev.sh check
```

## Project Structure

```
frontend/
├── android/              # Android native project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── res/      # Icons, splash screens
│   │   └── build.gradle  # Android build config
│   └── build.gradle
├── ios/                  # iOS native project
│   └── App/
│       ├── App/
│       │   ├── Info.plist
│       │   └── Assets.xcassets/  # Icons, splash screens
│       └── App.xcodeproj
├── src/
│   └── utils/
│       └── capacitor.ts  # Native features integration
├── capacitor.config.ts   # Capacitor configuration
└── mobile-dev.sh         # Development helper script
```

## Available Scripts

### npm scripts

```bash
# Build web app only
npm run build

# Build web + sync to mobile
npm run build:mobile

# Sync to all platforms
npm run cap:sync

# Sync to specific platform
npm run cap:sync:android
npm run cap:sync:ios

# Open in native IDE
npm run cap:open:android
npm run cap:open:ios

# Run on device
npm run cap:run:android
npm run cap:run:ios
```

### Helper script

```bash
# Interactive menu
./mobile-dev.sh

# Direct commands
./mobile-dev.sh build
./mobile-dev.sh sync
./mobile-dev.sh check
./mobile-dev.sh info
```

## Native Features

The app includes these native integrations:

- ✅ Push notifications (FCM/APNs)
- ✅ Native share dialog
- ✅ Haptic feedback
- ✅ Status bar styling
- ✅ Splash screen
- ✅ App state management

See [src/utils/capacitor.ts](src/utils/capacitor.ts) for implementation.

## Building Apps

### Android

**Automated (GitHub Actions - No Android Studio needed)**:
1. Push code to GitHub
2. GitHub Actions builds APK automatically
3. Download from Actions artifacts
4. Install on device

**Manual (Requires Android Studio)**:
1. `npm run cap:open:android`
2. Build → Build APK(s)
3. Transfer APK to device

### iOS

**Requires Mac + Xcode** or **EAS Build** ($29/month)

See [MOBILE_APP_SETUP.md](../MOBILE_APP_SETUP.md) for detailed instructions.

## Testing

### Android Device
1. Enable USB Debugging
2. Connect via USB
3. `npm run cap:run:android`

### iOS Device
1. Connect via USB
2. Trust computer
3. `npm run cap:run:ios` (Mac only)

### Web Testing
```bash
npm run dev
# Native features will have web fallbacks
```

## Updating Icons and Splash Screens

### Android

Place images in:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- `android/app/src/main/res/drawable/splash.png`

Or use: https://icon.kitchen

### iOS

Use Xcode:
1. `npm run cap:open:ios`
2. Select Assets.xcassets
3. Drag and drop icons

Or use: https://www.appicon.co

## Troubleshooting

### "Capacitor not synced"
```bash
npm run cap:sync
```

### "Native module not found"
```bash
npm install
npx cap sync
```

### Build errors
```bash
./mobile-dev.sh clean
./mobile-dev.sh build-sync
```

## Environment Check

Run this to verify your setup:
```bash
./mobile-dev.sh check
```

Should show:
- ✅ Node.js installed
- ✅ npm installed
- ✅ Capacitor configured
- ℹ️ Java/Android SDK (optional)
- ℹ️ Xcode (optional, Mac only)

## Resources

- [Full Setup Guide](../MOBILE_APP_SETUP.md)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [GitHub Actions Workflow](../.github/workflows/android-build.yml)

## Platform Versions

- **Android**: Min SDK 24 (Android 7.0+)
- **iOS**: Min iOS 13.0+
- **Capacitor**: 6.x
- **Node**: 20.x

## Support

For issues:
1. Check [MOBILE_APP_SETUP.md](../MOBILE_APP_SETUP.md) troubleshooting section
2. Run `./mobile-dev.sh check` to verify environment
3. Check GitHub Actions logs for build errors
