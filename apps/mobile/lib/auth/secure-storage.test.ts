import * as SecureStore from 'expo-secure-store';
import {
  getToken,
  setToken,
  deleteToken,
  migrateLegacyTokens,
} from './secure-storage';

jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('secure-storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('setToken stores tokens in the default secure store scope', async () => {
    await setToken('access-token-value', 'refresh-token-value');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth_access_token',
      'access-token-value',
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth_refresh_token',
      'refresh-token-value',
    );
  });

  it('getToken retrieves stored tokens', async () => {
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

  it('migrateLegacyTokens is a no-op after shared keychain removal', async () => {
    await migrateLegacyTokens();

    expect(mockSecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('deleteToken removes both keys from the default secure store scope', async () => {
    await deleteToken();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_access_token');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
  });
});
