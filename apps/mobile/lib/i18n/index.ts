import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';

const languageTag = Localization.getLocales()[0]?.languageTag ?? 'ja';
const languageCode = languageTag.startsWith('ja') ? 'ja' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ja: { translation: ja } },
    lng: languageCode,
    fallbackLng: 'ja',
    interpolation: { escapeValue: false },
  });

export default i18n;
