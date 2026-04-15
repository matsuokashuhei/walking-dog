import * as SecureStore from 'expo-secure-store';
import { getToken, setToken, deleteToken } from './secure-storage';

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

  it('getToken retrieves stored tokens with shared options (migration already done)', async () => {
    mockSecureStore.getItemAsync.mockImplementation((key) => {
      if (key === 'auth_migration_v1_done') return Promise.resolve('1');
      if (key === 'auth_access_token') return Promise.resolve('stored-access');
      if (key === 'auth_refresh_token') return Promise.resolve('stored-refresh');
      return Promise.resolve(null);
    });
    const result = await getToken();
    expect(result).toEqual({ accessToken: 'stored-access', refreshToken: 'stored-refresh' });
  });

  it('getToken returns null when no token stored', async () => {
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(key === 'auth_migration_v1_done' ? '1' : null),
    );
    const result = await getToken();
    expect(result).toBeNull();
  });

  it('getToken migrates legacy tokens from default scope on first run', async () => {
    // Migration flag absent → migration runs.
    // Legacy reads (no options) return tokens; shared reads initially return nothing.
    mockSecureStore.getItemAsync.mockImplementation((key, options) => {
      if (key === 'auth_migration_v1_done') return Promise.resolve(null);
      if (!options && key === 'auth_access_token') return Promise.resolve('legacy-access');
      if (!options && key === 'auth_refresh_token') return Promise.resolve('legacy-refresh');
      if (options && key === 'auth_access_token') return Promise.resolve('legacy-access');
      if (options && key === 'auth_refresh_token') return Promise.resolve('legacy-refresh');
      return Promise.resolve(null);
    });

    const result = await getToken();

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth_access_token',
      'legacy-access',
      sharedOptions,
    );
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_access_token');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth_migration_v1_done',
      '1',
      sharedOptions,
    );
    expect(result).toEqual({ accessToken: 'legacy-access', refreshToken: 'legacy-refresh' });
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
