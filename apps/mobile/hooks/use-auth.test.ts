import { act, renderHook } from '@testing-library/react-native';
import type * as UseAuthModule from './use-auth';
import type * as AuthApiModule from '@/lib/auth/api';
import type * as AuthStoreModule from '@/stores/auth-store';

jest.mock('@/lib/auth/api', () => ({
  requestOneTimePassword: jest.fn(),
  verifyOneTimePassword: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

const { useAuth } = require('./use-auth') as typeof UseAuthModule;
const authApi = require('@/lib/auth/api') as typeof AuthApiModule;
const { useAuthStore } = require('@/stores/auth-store') as typeof AuthStoreModule;
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('use-auth', () => {
  const mockSetAuth = jest.fn();
  const mockClearAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      setAuth: mockSetAuth,
      clearAuth: mockClearAuth,
      initialize: jest.fn(),
    });
  });

  it('requestOneTimePassword delegates to authApi', async () => {
    mockAuthApi.requestOneTimePassword.mockResolvedValue({ challengeId: 'challenge-id' });

    const { result } = renderHook(() => useAuth());
    await expect(result.current.requestOneTimePassword('owner@example.com')).resolves.toEqual({
      challengeId: 'challenge-id',
    });

    expect(mockAuthApi.requestOneTimePassword).toHaveBeenCalledWith('owner@example.com');
  });

  it('verifyOneTimePassword calls authApi then sets auth', async () => {
    mockAuthApi.verifyOneTimePassword.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.verifyOneTimePassword('challenge-id', '123456');
    });

    expect(mockAuthApi.verifyOneTimePassword).toHaveBeenCalledWith(
      'challenge-id',
      '123456',
    );
    expect(mockSetAuth).toHaveBeenCalledWith('access', 'refresh');
  });

  it('signOut calls authApi.signOut then clears auth when token is present', async () => {
    mockAuthApi.signOut.mockResolvedValue(true);
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'my-token',
      setAuth: mockSetAuth,
      clearAuth: mockClearAuth,
      initialize: jest.fn(),
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signOut();
    });

    expect(mockAuthApi.signOut).toHaveBeenCalledWith('my-token');
    expect(mockClearAuth).toHaveBeenCalled();
  });

  it('signOut clears auth without calling API when there is no token', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signOut();
    });

    expect(mockAuthApi.signOut).not.toHaveBeenCalled();
    expect(mockClearAuth).toHaveBeenCalled();
  });
});
