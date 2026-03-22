// apps/mobile/app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_ENV !== 'production';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'Walking Dog (Dev)' : 'Walking Dog',
  slug: 'walking-dog',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'walking-dog',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: IS_DEV ? 'com.walkingdog.dev' : 'com.walkingdog.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Walking Dog uses your location to record walk routes.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    package: IS_DEV ? 'com.walkingdog.dev' : 'com.walkingdog.app',
  },
  web: {
    output: 'static' as const,
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: { backgroundColor: '#000000' },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Walking Dog uses your location to record walk routes.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Walking Dog to access your photos for dog profile pictures.',
      },
    ],
    'expo-secure-store',
    'expo-sqlite',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    apiUrl: process.env.API_URL ?? 'http://localhost:3000',
  },
});
