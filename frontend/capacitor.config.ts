import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.desidealsai.app',
  appName: 'DesiDealsAI',
  webDir: 'dist',
  server: {
    // Use bundled files - API URLs are handled dynamically in client.ts
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
};

export default config;
