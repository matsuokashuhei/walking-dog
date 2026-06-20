import { act, renderHook } from '@testing-library/react-native';
import type * as UseAuthModule from './use-auth';
import type * as AuthApiModule from '@/lib/auth/api';
import type * as AuthStoreModule from '@/stores/auth-store';

jest.mock('@/lib/auth/api', () => ({
  refreshToken: jest.fn(),
  requestOneTimePassword: jest.fn(),
  signOut: jest.fn(),
  verifyOneTimePassword: jest.fn(),
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

  it('requestOneTimePassword returns a one-time password challenge without setting auth', async () => {
    mockAuthApi.requestOneTimePassword.mockResolvedValue({
      email: 'user@example.com',
      session: 'otp-session',
      codeLength: 8,
    });

    const { result } = renderHook(() => useAuth());
    await expect(result.current.requestOneTimePassword('user@example.com')).resolves.toEqual({
      email: 'user@example.com',
      session: 'otp-session',
      codeLength: 8,
    });

    expect(mockAuthApi.requestOneTimePassword).toHaveBeenCalledWith('user@example.com');
    expect(mockSetAuth).not.toHaveBeenCalled();
  });

  it('verifyOneTimePassword stores returned tokens', async () => {
    mockAuthApi.verifyOneTimePassword.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.verifyOneTimePassword({
        email: 'user@example.com',
        session: 'otp-session',
        code: '12345678',
      });
    });

    expect(mockAuthApi.verifyOneTimePassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      session: 'otp-session',
      code: '12345678',
    });
    expect(mockSetAuth).toHaveBeenCalledWith('access', 'refresh');
  });

  it('signOut calls authApi.signOut then clears auth (no token)', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signOut();
    });

    expect(mockAuthApi.signOut).not.toHaveBeenCalled();
    expect(mockClearAuth).toHaveBeenCalled();
  });

  it('signOut calls authApi.signOut with token when token is present', async () => {
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
});
