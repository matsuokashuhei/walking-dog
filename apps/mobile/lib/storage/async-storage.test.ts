import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getStoredItem,
  setStoredItem,
  SETTINGS_THEME_KEY,
  SETTINGS_UNITS_KEY,
} from './async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('async-storage wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads typed values from AsyncStorage', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('dark');

    await expect(getStoredItem(SETTINGS_THEME_KEY)).resolves.toBe('dark');
    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(SETTINGS_THEME_KEY);
  });

  it('returns null when reading from AsyncStorage fails', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('unavailable'));

    await expect(getStoredItem(SETTINGS_UNITS_KEY)).resolves.toBeNull();
  });

  it('writes typed values to AsyncStorage', async () => {
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    await expect(setStoredItem(SETTINGS_UNITS_KEY, 'mile')).resolves.toBe(true);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(SETTINGS_UNITS_KEY, 'mile');
  });

  it('returns false when writing to AsyncStorage fails', async () => {
    mockAsyncStorage.setItem.mockRejectedValue(new Error('unavailable'));

    await expect(setStoredItem(SETTINGS_THEME_KEY, 'auto')).resolves.toBe(false);
  });
});
