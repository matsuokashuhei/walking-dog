import * as SecureStore from 'expo-secure-store';
import {
  getToken,
  setToken,
  deleteToken,
  migrateLegacyTokens,
} from './secure-storage';

jest.mock('expo-secure-store');
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        appGroup: 'group.com.walkingdog.dev',
        keychainService: 'com.walkingdog.shared',
      },
    },
  },
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const sharedOptions = {
  accessGroup: 'group.com.walkingdog.dev',
  keychainService: 'com.walkingdog.shared',
};

describe('secure-storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('setToken stores tokens with shared keychain options', async () => {
    await setToken('access-token-value', 'refresh-token-value');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth_access_token',
      'access-token-value',
      sharedOptions,
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth_refresh_token',
      'refresh-token-value',
      sharedOptions,
    );
  });

  it('getToken retrieves stored tokens with shared options', async () => {
    mockSecureStore.getItemAsync.mockImplementation((key) => {
      if (key === 'auth_access_token') return Promise.resolve('stored-access');
      if (key === 'auth_refresh_token') return Promise.resolve('stored-refresh');
      return Promise.resolve(null);
    });
    const result = await getToken();
    expect(result).toEqual({ accessToken: 'stored-access', refreshToken: 'stored-refresh' });
  });

  it('getToken returns null when no token stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    const result = await getToken();
    expect(result).toBeNull();
  });

  it('getToken does not attempt legacy migration', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    await getToken();
    // Migration flag should never be read from getToken
    const flagReads = mockSecureStore.getItemAsync.mock.calls.filter(
      ([key]) => key === 'auth_migration_v1_done',
    );
    expect(flagReads).toHaveLength(0);
  });

  it('migrateLegacyTokens copies legacy tokens into shared scope on first run', async () => {
    mockSecureStore.getItemAsync.mockImplementation((key, options) => {
      if (key === 'auth_migration_v1_done') return Promise.resolve(null);
      if (!options && key === 'auth_access_token') return Promise.resolve('legacy-access');
      if (!options && key === 'auth_refresh_token') return Promise.resolve('legacy-refresh');
      return Promise.resolve(null);
    });

    await migrateLegacyTokens();

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth_access_token',
      'legacy-access',
      sharedOptions,
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth_refresh_token',
      'legacy-refresh',
      sharedOptions,
    );
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_access_token');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth_migration_v1_done',
      '1',
      sharedOptions,
    );
  });

  it('migrateLegacyTokens is a no-op once the flag is set', async () => {
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(key === 'auth_migration_v1_done' ? '1' : null),
    );

    await migrateLegacyTokens();

    // No writes to token keys
    const tokenWrites = mockSecureStore.setItemAsync.mock.calls.filter(
      ([key]) => key === 'auth_access_token' || key === 'auth_refresh_token',
    );
    expect(tokenWrites).toHaveLength(0);
  });

  it('deleteToken removes both keys with shared options', async () => {
    await deleteToken();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_access_token', sharedOptions);
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'auth_refresh_token',
      sharedOptions,
    );
  });
});
