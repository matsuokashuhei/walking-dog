// apps/mobile/app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

const APP_GROUP = 'group.com.walkingdog.app';
const KEYCHAIN_SERVICE = 'com.walkingdog.shared';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Walking Dog',
  slug: 'walking-dog',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'walking-dog',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.walkingdog.app',
    appleTeamId: process.env.APPLE_TEAM_ID ?? 'CY4LJR5KMM',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Walking Dog uses your location to record walk routes.',
      NSBluetoothAlwaysUsageDescription:
        'Walking Dog uses Bluetooth to detect nearby dogs during walks.',
      NSSupportsLiveActivities: true,
      NSSupportsLiveActivitiesFrequentUpdates: true,
    },
    entitlements: {
      'com.apple.security.application-groups': [APP_GROUP],
      'keychain-access-groups': [`$(AppIdentifierPrefix)${APP_GROUP}`],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    package: 'com.walkingdog.app',
  },
  web: {
    output: 'static' as const,
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-image',
    'expo-localization',
    'expo-web-browser',
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
        cameraPermission: 'Allow Walking Dog to use the camera to record walk events.',
      },
    ],
    'expo-secure-store',
    'expo-sqlite',
    [
      'react-native-ble-plx',
      {
        isBackgroundEnabled: false,
        neverForLocation: true,
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '17.0',
        },
      },
    ],
    '@bacons/apple-targets',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appGroup: APP_GROUP,
    keychainService: KEYCHAIN_SERVICE,
  },
});
