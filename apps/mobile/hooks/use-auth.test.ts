import { act, renderHook } from '@testing-library/react-native';
import { useAuth } from './use-auth';
import * as authApi from '@/lib/auth/api';
import { useAuthStore } from '@/stores/auth-store';

jest.mock('@/lib/auth/api');
jest.mock('@/stores/auth-store');

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
