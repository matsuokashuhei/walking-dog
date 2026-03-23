import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/lib/i18n';

type ThemeMode = 'light' | 'dark' | 'auto';

interface SettingsState {
  theme: ThemeMode;
  language: string;
  isLoaded: boolean;
  initialize: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
}

const THEME_KEY = 'settings_theme';
const LANGUAGE_KEY = 'settings_language';

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'auto',
  language: 'ja',
  isLoaded: false,

  initialize: async () => {
    const [theme, language] = await Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(LANGUAGE_KEY),
    ]);
    const lang = language ?? 'ja';
    await i18n.changeLanguage(lang);
    set({
      theme: (theme as ThemeMode) ?? 'auto',
      language: lang,
      isLoaded: true,
    });
  },

  setTheme: async (theme) => {
    await AsyncStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },

  setLanguage: async (language) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    await i18n.changeLanguage(language);
    set({ language });
  },
}));
