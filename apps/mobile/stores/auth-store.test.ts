import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from './auth-store';
import * as secureStorage from '@/lib/auth/secure-storage';
import { setAuthToken } from '@/lib/graphql/client';

jest.mock('@/lib/auth/secure-storage');
jest.mock('@/lib/graphql/client');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockSetAuthToken = setAuthToken as jest.Mock;

describe('auth-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ token: null, isAuthenticated: false, isLoading: false });
  });

  it('initialize: sets token from SecureStore and calls setAuthToken', async () => {
    mockSecureStorage.getToken.mockResolvedValue({
      idToken: 'test-id-token',
      refreshToken: 'test-refresh',
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.initialize();
    });

    expect(mockSetAuthToken).toHaveBeenCalledWith('test-id-token');
    expect(result.current.token).toBe('test-id-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('initialize: does nothing when no token stored', async () => {
    mockSecureStorage.getToken.mockResolvedValue(null);

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.initialize();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it('setAuth: stores token and updates state', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.setAuth('id-token', 'refresh-token');
    });

    expect(mockSecureStorage.setToken).toHaveBeenCalledWith('id-token', 'refresh-token');
    expect(mockSetAuthToken).toHaveBeenCalledWith('id-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('clearAuth: removes token and resets state', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.clearAuth();
    });

    expect(mockSecureStorage.deleteToken).toHaveBeenCalled();
    expect(mockSetAuthToken).toHaveBeenCalledWith(null);
    expect(result.current.isAuthenticated).toBe(false);
  });
});
