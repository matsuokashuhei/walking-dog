jest.mock(
  '@react-native-async-storage/async-storage',
  () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    mergeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    flushGetRequests: jest.fn(),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
    multiMerge: jest.fn(() => Promise.resolve()),
  }),
);

jest.mock('react-native-reanimated', () => {
  const { Animated, Image, Text, View } = require('react-native');

  class AnimationBuilderMock {
    duration() {
      return this;
    }
    springify() {
      return this;
    }
    damping() {
      return this;
    }
    stiffness() {
      return this;
    }
  }

  return {
    __esModule: true,
    default: {
      ...Animated,
      Image,
      Text,
      View,
      createAnimatedComponent: (component: unknown) => component,
    },
    FadeIn: new AnimationBuilderMock(),
    FadeOut: new AnimationBuilderMock(),
    LinearTransition: new AnimationBuilderMock(),
  };
});

// Initialize i18next with English translations so t() returns real strings in tests.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ja from './lib/i18n/locales/ja.json';
import en from './lib/i18n/locales/en.json';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ja: { translation: ja } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    initAsync: false,
  });
}

// Eagerly trigger all lazy globals installed by expo/src/winter/runtime.native.ts
// so their values are cached in the module registry before Jest 30 closes the scope.
const globals = [
  'TextDecoder',
  'TextDecoderStream',
  'TextEncoderStream',
  'URL',
  'URLSearchParams',
  '__ExpoImportMetaRegistry',
  'structuredClone',
] as const;

for (const name of globals) {
  try {
    // Accessing the global triggers the lazy getter, which calls require() and
    // caches the result. Subsequent accesses use the cached value directly.
    void (global as any)[name];
  } catch {
    // Some globals may not be present; ignore errors.
  }
}
