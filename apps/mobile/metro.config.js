// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Block native-only modules from web bundle to prevent bundler crashes.
// These modules use native APIs (SQLite WASM, native maps) that are
// incompatible with the web platform.
if (process.env.EXPO_PLATFORM === 'web' || process.env.PLATFORM === 'web') {
  config.resolver.blockList = [
    ...(config.resolver.blockList ? [config.resolver.blockList] : []),
    /node_modules\/react-native-maps\/.*/,
  ];
}

module.exports = config;
