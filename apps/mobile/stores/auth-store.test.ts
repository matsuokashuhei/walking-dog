import { act, renderHook } from '@testing-library/react-native';
import { ClientError } from 'graphql-request';
import { useAuthStore } from './auth-store';
import * as secureStorage from '@/lib/auth/secure-storage';
import { setAuthToken } from '@/lib/graphql/client';
import * as authApi from '@/lib/auth/api';

jest.mock('@/lib/auth/secure-storage');
jest.mock('@/lib/graphql/client');
jest.mock('@/lib/auth/api');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockSetAuthToken = setAuthToken as jest.Mock;
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('auth-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: null, isAuthenticated: false, isLoading: false });
  });

  it('initialize: sets accessToken from SecureStore and calls setAuthToken', async () => {
    mockSecureStorage.getToken.mockResolvedValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh',
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.initialize();
    });

    expect(mockSetAuthToken).toHaveBeenCalledWith('test-access-token');
    expect(result.current.accessToken).toBe('test-access-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('initialize: does nothing when no token stored', async () => {
    mockSecureStorage.getToken.mockResolvedValue(null);

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.initialize();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });

  it('setAuth: stores token and updates state', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.setAuth('access-token', 'refresh-token');
    });

    expect(mockSecureStorage.setToken).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(mockSetAuthToken).toHaveBeenCalledWith('access-token');
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

  describe('refreshAuth', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockSecureStorage.getToken.mockResolvedValue({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns true and updates state on success', async () => {
      mockAuthApi.refreshToken.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await useAuthStore.getState().refreshAuth();

      expect(result).toBe(true);
      expect(mockSecureStorage.setToken).toHaveBeenCalledWith('new-access', 'new-refresh');
      expect(mockSetAuthToken).toHaveBeenCalledWith('new-access');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('returns false when no refresh token stored', async () => {
      mockSecureStorage.getToken.mockResolvedValue(null);

      const result = await useAuthStore.getState().refreshAuth();

      expect(result).toBe(false);
      expect(mockAuthApi.refreshToken).not.toHaveBeenCalled();
    });

    it('retries on network error and succeeds', async () => {
      mockAuthApi.refreshToken
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
        });

      const promise = useAuthStore.getState().refreshAuth();
      await jest.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toBe(true);
      expect(mockAuthApi.refreshToken).toHaveBeenCalledTimes(2);
    });

    it('gives up after MAX_RETRIES network errors', async () => {
      mockAuthApi.refreshToken.mockRejectedValue(new TypeError('Failed to fetch'));

      const promise = useAuthStore.getState().refreshAuth();
      // Advance past all backoff delays: 1s + 2s + 4s
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);
      const result = await promise;

      expect(result).toBe(false);
      // 1 initial + 3 retries = 4 attempts
      expect(mockAuthApi.refreshToken).toHaveBeenCalledTimes(4);
    });

    it('does not retry on auth error (4xx)', async () => {
      const authError = new ClientError(
        { status: 401, headers: new Headers(), errors: [] },
        { query: '' },
      );
      mockAuthApi.refreshToken.mockRejectedValue(authError);

      const result = await useAuthStore.getState().refreshAuth();

      expect(result).toBe(false);
      expect(mockAuthApi.refreshToken).toHaveBeenCalledTimes(1);
    });
  });
});
