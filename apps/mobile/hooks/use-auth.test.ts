import { act, renderHook } from '@testing-library/react-native';
import type * as UseAuthModule from './use-auth';
import type * as AuthApiModule from '@/lib/auth/api';
import type * as AuthStoreModule from '@/stores/auth-store';

jest.mock('@/lib/auth/api', () => ({
  confirmSignUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
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

  it('signIn calls authApi then sets auth', async () => {
    mockAuthApi.signIn.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn('user@example.com', 'password');
    });

    expect(mockAuthApi.signIn).toHaveBeenCalledWith('user@example.com', 'password');
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
