// Workaround for Jest 30 + jest-expo 55 + Expo SDK 54 compatibility.
//
// jest-expo 55 targets Jest 29. In Jest 30, calling require() from lazy getters
// (installed during setupFiles) throws "outside of scope" errors when those
// getters are accessed during test execution.
//
// expo/src/winter/runtime.native.ts installs lazy getters on globals like
// structuredClone, TextDecoder, URL, etc. via installGlobal(). When these
// getters are accessed in Jest 30, the deferred require() call fails.
//
// Fix: After jest-expo's setupFiles have run, eagerly resolve these globals
// by accessing them once so their lazy values are replaced with real values.
// This converts deferred require() calls into pre-cached module references.

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
