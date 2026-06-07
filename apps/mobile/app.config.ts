// apps/mobile/app.config.ts
import type { ExpoConfig, ConfigContext } from 'expo/config';
import en from './lib/i18n/locales/en.json';

const nativePermissions = en.nativePermissions;

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
    entitlements: {
      'com.apple.security.application-groups': ['group.com.walkingdog.app'],
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription: nativePermissions.locationWhenInUse,
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
        locationWhenInUsePermission: nativePermissions.locationWhenInUse,
        locationAlwaysAndWhenInUsePermission: nativePermissions.locationAlwaysAndWhenInUse,
        isIosBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: nativePermissions.photos,
        cameraPermission: nativePermissions.camera,
      },
    ],
    [
      'expo-widgets',
      {
        bundleIdentifier: 'com.walkingdog.app.widgets',
        groupIdentifier: 'group.com.walkingdog.app',
        frequentUpdates: true,
        widgets: [],
      },
    ],
    '@bacons/apple-targets',
    './plugins/with-stable-widget-build-phases',
    'expo-secure-store',
    'expo-sqlite',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '17.0',
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
