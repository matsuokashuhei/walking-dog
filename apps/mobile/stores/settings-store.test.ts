import i18n from '@/lib/i18n';
import * as storage from '@/lib/storage/async-storage';
import { useSettingsStore } from './settings-store';

jest.mock('@/lib/storage/async-storage');
jest.mock('@/lib/i18n', () => ({
  __esModule: true,
  default: {
    language: 'ja',
    changeLanguage: jest.fn(),
  },
}));

const mockGetStoredItem = storage.getStoredItem as jest.Mock;
const mockSetStoredItem = storage.setStoredItem as jest.Mock;
const mockI18n = i18n as unknown as {
  language: string;
  changeLanguage: jest.Mock;
};

describe('settings-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockI18n.language = 'ja';
    mockI18n.changeLanguage.mockResolvedValue(undefined);
    useSettingsStore.setState({
      theme: 'auto',
      language: 'ja',
      units: 'km',
      isLoaded: false,
    });
  });

  it('initialize loads stored settings and applies the saved language', async () => {
    mockGetStoredItem
      .mockResolvedValueOnce('dark')
      .mockResolvedValueOnce('en')
      .mockResolvedValueOnce('mile');

    await useSettingsStore.getState().initialize();

    expect(mockI18n.changeLanguage).toHaveBeenCalledWith('en');
    expect(useSettingsStore.getState()).toMatchObject({
      theme: 'dark',
      language: 'en',
      units: 'mile',
      isLoaded: true,
    });
  });

  it('initialize falls back to defaults when storage is empty', async () => {
    mockGetStoredItem.mockResolvedValue(null);

    await useSettingsStore.getState().initialize();

    expect(mockI18n.changeLanguage).not.toHaveBeenCalled();
    expect(useSettingsStore.getState()).toMatchObject({
      theme: 'auto',
      language: 'ja',
      units: 'km',
      isLoaded: true,
    });
  });

  it('setTheme updates state and persists the new theme', async () => {
    mockSetStoredItem.mockResolvedValue(true);

    await useSettingsStore.getState().setTheme('dark');

    expect(useSettingsStore.getState().theme).toBe('dark');
    expect(mockSetStoredItem).toHaveBeenCalledWith(storage.SETTINGS_THEME_KEY, 'dark');
  });

  it('setLanguage updates i18n and persists the new language', async () => {
    mockSetStoredItem.mockResolvedValue(true);

    await useSettingsStore.getState().setLanguage('en');

    expect(mockI18n.changeLanguage).toHaveBeenCalledWith('en');
    expect(useSettingsStore.getState().language).toBe('en');
    expect(mockSetStoredItem).toHaveBeenCalledWith(storage.SETTINGS_LANGUAGE_KEY, 'en');
  });

  it('setUnits updates state and persists the new units', async () => {
    mockSetStoredItem.mockResolvedValue(true);

    await useSettingsStore.getState().setUnits('mile');

    expect(useSettingsStore.getState().units).toBe('mile');
    expect(mockSetStoredItem).toHaveBeenCalledWith(storage.SETTINGS_UNITS_KEY, 'mile');
  });
});
