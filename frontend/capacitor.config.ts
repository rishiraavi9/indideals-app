import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.indideals.app',
  appName: 'IndiaDeals',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development, you can set this to your local server:
    // url: 'http://localhost:5173',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2563eb',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#2563eb',
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
};

export default config;
