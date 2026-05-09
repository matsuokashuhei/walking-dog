import type * as BootstrapModule from './bootstrap';
import type * as GraphQLClientModule from '@/lib/graphql/client';
import { ME_QUERY } from '@/lib/graphql/queries/me';
import * as secureStorage from '@/lib/auth/secure-storage';
import { ClientError } from '@/lib/graphql/client-error';

jest.mock('@/lib/auth/secure-storage');
jest.mock('@/lib/graphql/client', () => ({
  authenticatedRequest: jest.fn(),
  setAuthToken: jest.fn(),
  setRefreshHandler: jest.fn(),
}));

const { bootstrapAuth } = require('./bootstrap') as typeof BootstrapModule;
const {
  authenticatedRequest,
  setAuthToken,
  setRefreshHandler,
} = require('@/lib/graphql/client') as typeof GraphQLClientModule;

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockAuthenticatedRequest = authenticatedRequest as jest.Mock;
const mockSetAuthToken = setAuthToken as jest.Mock;
const mockSetRefreshHandler = setRefreshHandler as jest.Mock;

describe('bootstrapAuth', () => {
  const clearAuth = jest.fn();
  const refreshAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearAuth.mockResolvedValue(undefined);
    refreshAuth.mockResolvedValue(true);
  });

  it('runs legacy-token migration before reading tokens', async () => {
    const order: string[] = [];

    mockSecureStorage.migrateLegacyTokens.mockImplementation(async () => {
      order.push('migrate');
    });
    mockSecureStorage.getToken.mockImplementation(async () => {
      order.push('getToken');
      return null;
    });

    await bootstrapAuth({ clearAuth, refreshAuth });

    expect(order).toEqual(['migrate', 'getToken']);
  });

  it('registers the refresh handler before bootstrapping auth', async () => {
    mockSecureStorage.getToken.mockResolvedValue(null);

    await bootstrapAuth({ clearAuth, refreshAuth });

    expect(mockSetRefreshHandler).toHaveBeenCalledTimes(1);
    expect(mockSetRefreshHandler).toHaveBeenCalledWith(expect.any(Function));
  });

  it('returns the authenticated token after validating the session', async () => {
    mockSecureStorage.getToken
      .mockResolvedValueOnce({
        accessToken: 'stored-access-token',
        refreshToken: 'stored-refresh-token',
      })
      .mockResolvedValueOnce({
        accessToken: 'refreshed-access-token',
        refreshToken: 'stored-refresh-token',
      });
    mockAuthenticatedRequest.mockResolvedValue({ me: { id: '1' } });

    await expect(bootstrapAuth({ clearAuth, refreshAuth })).resolves.toEqual({
      accessToken: 'refreshed-access-token',
      isAuthenticated: true,
      networkError: false,
    });

    expect(mockSetAuthToken).toHaveBeenCalledWith('stored-access-token');
    expect(mockAuthenticatedRequest).toHaveBeenCalledWith(ME_QUERY);
  });

  it('returns an unauthenticated state when there is no stored token', async () => {
    mockSecureStorage.getToken.mockResolvedValue(null);

    await expect(bootstrapAuth({ clearAuth, refreshAuth })).resolves.toEqual({
      accessToken: null,
      isAuthenticated: false,
      networkError: false,
    });

    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
  });

  it('clears auth when token validation fails', async () => {
    const authError = new ClientError(
      { status: 401, headers: new Headers(), errors: [], body: '' },
      { query: '' },
    );

    mockSecureStorage.getToken.mockResolvedValue({
      accessToken: 'bad-access-token',
      refreshToken: 'bad-refresh-token',
    });
    mockAuthenticatedRequest.mockRejectedValue(authError);

    await expect(bootstrapAuth({ clearAuth, refreshAuth })).resolves.toEqual({
      accessToken: null,
      isAuthenticated: false,
      networkError: false,
    });

    expect(clearAuth).toHaveBeenCalledTimes(1);
  });

  it('clears the auth header when clearAuth fails', async () => {
    const authError = new ClientError(
      { status: 401, headers: new Headers(), errors: [], body: '' },
      { query: '' },
    );

    mockSecureStorage.getToken.mockResolvedValue({
      accessToken: 'bad-access-token',
      refreshToken: 'bad-refresh-token',
    });
    mockAuthenticatedRequest.mockRejectedValue(authError);
    clearAuth.mockRejectedValue(new Error('storage failed'));

    await bootstrapAuth({ clearAuth, refreshAuth });

    expect(mockSetAuthToken).toHaveBeenLastCalledWith(null);
  });

  it('returns a network error result when the request fails offline', async () => {
    mockSecureStorage.getToken.mockResolvedValue({
      accessToken: 'stored-access-token',
      refreshToken: 'stored-refresh-token',
    });
    mockAuthenticatedRequest.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(bootstrapAuth({ clearAuth, refreshAuth })).resolves.toEqual({
      accessToken: null,
      isAuthenticated: false,
      networkError: true,
    });

    expect(clearAuth).not.toHaveBeenCalled();
  });

  it('returns a network error result when the API returns 5xx', async () => {
    const serverError = new ClientError(
      { status: 500, headers: new Headers(), errors: [], body: '' },
      { query: '' },
    );

    mockSecureStorage.getToken.mockResolvedValue({
      accessToken: 'stored-access-token',
      refreshToken: 'stored-refresh-token',
    });
    mockAuthenticatedRequest.mockRejectedValue(serverError);

    await expect(bootstrapAuth({ clearAuth, refreshAuth })).resolves.toEqual({
      accessToken: null,
      isAuthenticated: false,
      networkError: true,
    });

    expect(clearAuth).not.toHaveBeenCalled();
  });
});
