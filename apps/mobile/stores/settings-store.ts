import { create } from 'zustand';
import i18n from '@/lib/i18n';
import {
  getStoredItem,
  setStoredItem,
  SETTINGS_LANGUAGE_KEY,
  SETTINGS_THEME_KEY,
  SETTINGS_UNITS_KEY,
  type ThemeMode,
  type Units,
} from '@/lib/storage/async-storage';

interface SettingsState {
  theme: ThemeMode;
  language: string;
  units: Units;
  isLoaded: boolean;
  initialize: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
  setUnits: (units: Units) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'auto',
  language: 'ja',
  units: 'km',
  isLoaded: false,

  initialize: async () => {
    try {
      const [theme, language, units] = await Promise.all([
        getStoredItem(SETTINGS_THEME_KEY),
        getStoredItem(SETTINGS_LANGUAGE_KEY),
        getStoredItem(SETTINGS_UNITS_KEY),
      ]);
      const nextLanguage = language ?? i18n.language;
      if (language && language !== i18n.language) {
        await i18n.changeLanguage(nextLanguage);
      }

      set({
        theme: theme ?? 'auto',
        language: nextLanguage,
        units: units === 'mile' ? 'mile' : 'km',
        isLoaded: true,
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  setTheme: async (theme) => {
    set({ theme });
    await setStoredItem(SETTINGS_THEME_KEY, theme);
  },

  setLanguage: async (language) => {
    await i18n.changeLanguage(language);
    set({ language });
    await setStoredItem(SETTINGS_LANGUAGE_KEY, language);
  },

  setUnits: async (units) => {
    set({ units });
    await setStoredItem(SETTINGS_UNITS_KEY, units);
  },
}));
