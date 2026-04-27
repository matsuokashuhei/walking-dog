jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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
    initImmediate: false,
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
