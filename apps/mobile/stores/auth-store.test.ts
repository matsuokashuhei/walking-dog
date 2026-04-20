import { ClientError } from 'graphql-request';
import { useAuthStore } from './auth-store';
import * as secureStorage from '@/lib/auth/secure-storage';
import { setAuthToken } from '@/lib/graphql/client';
import * as authApi from '@/lib/auth/api';
import * as authBootstrap from '@/lib/auth/bootstrap';

jest.mock('@/lib/auth/secure-storage');
jest.mock('@/lib/graphql/client');
jest.mock('@/lib/auth/api');
jest.mock('@/lib/auth/bootstrap');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockSetAuthToken = setAuthToken as jest.Mock;
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockBootstrap = authBootstrap as jest.Mocked<typeof authBootstrap>;

describe('auth-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      networkError: false,
    });
  });

  it('initialize delegates to bootstrapAuth and applies the bootstrap result', async () => {
    mockBootstrap.bootstrapAuth.mockResolvedValue({
      accessToken: 'test-access-token',
      isAuthenticated: true,
      networkError: false,
    });

    await useAuthStore.getState().initialize();

    expect(mockBootstrap.bootstrapAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        clearAuth: expect.any(Function),
        refreshAuth: expect.any(Function),
      }),
    );
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'test-access-token',
      isAuthenticated: true,
      isLoading: false,
      networkError: false,
    });
  });

  it('initialize stores bootstrap network errors', async () => {
    mockBootstrap.bootstrapAuth.mockResolvedValue({
      accessToken: null,
      isAuthenticated: false,
      networkError: true,
    });

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      networkError: true,
    });
  });

  it('setAuth stores tokens and updates state', async () => {
    await useAuthStore.getState().setAuth('access-token', 'refresh-token');

    expect(mockSecureStorage.setToken).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(mockSetAuthToken).toHaveBeenCalledWith('access-token');
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'access-token',
      isAuthenticated: true,
    });
  });

  it('clearAuth removes tokens and resets state', async () => {
    await useAuthStore.getState().clearAuth();

    expect(mockSecureStorage.deleteToken).toHaveBeenCalled();
    expect(mockSetAuthToken).toHaveBeenCalledWith(null);
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      isAuthenticated: false,
      networkError: false,
    });
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

    it('gives up after MAX_ATTEMPTS network errors', async () => {
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
        { status: 401, headers: new Headers(), errors: [], body: '' },
        { query: '' },
      );
      mockAuthApi.refreshToken.mockRejectedValue(authError);

      const result = await useAuthStore.getState().refreshAuth();

      expect(result).toBe(false);
      expect(mockAuthApi.refreshToken).toHaveBeenCalledTimes(1);
    });
  });
});
