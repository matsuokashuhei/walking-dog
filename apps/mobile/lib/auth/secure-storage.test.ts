import * as SecureStore from 'expo-secure-store';
import { getToken, setToken, deleteToken } from './secure-storage';

jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('secure-storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('setToken stores idToken and refreshToken', async () => {
    await setToken('id-token-value', 'refresh-token-value');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('auth_id_token', 'id-token-value');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('auth_refresh_token', 'refresh-token-value');
  });

  it('getToken retrieves stored tokens', async () => {
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(key === 'auth_id_token' ? 'stored-id' : 'stored-refresh')
    );
    const result = await getToken();
    expect(result).toEqual({ idToken: 'stored-id', refreshToken: 'stored-refresh' });
  });

  it('getToken returns null when no token stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    const result = await getToken();
    expect(result).toBeNull();
  });

  it('deleteToken removes both keys', async () => {
    await deleteToken();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_id_token');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
  });
});
