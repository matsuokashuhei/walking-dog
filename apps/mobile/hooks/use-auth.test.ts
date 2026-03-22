import { act, renderHook } from '@testing-library/react-native';
import { useAuth } from './use-auth';
import * as cognitoLib from '@/lib/auth/cognito';
import { useAuthStore } from '@/stores/auth-store';

jest.mock('@/lib/auth/cognito');
jest.mock('@/stores/auth-store');

const mockCognito = cognitoLib as jest.Mocked<typeof cognitoLib>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('use-auth', () => {
  const mockSetAuth = jest.fn();
  const mockClearAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      token: null,
      setAuth: mockSetAuth,
      clearAuth: mockClearAuth,
      initialize: jest.fn(),
    });
  });

  it('signIn calls cognito then sets auth', async () => {
    mockCognito.signIn.mockResolvedValue({ idToken: 'id', refreshToken: 'refresh' });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn('user@example.com', 'password');
    });

    expect(mockCognito.signIn).toHaveBeenCalledWith('user@example.com', 'password');
    expect(mockSetAuth).toHaveBeenCalledWith('id', 'refresh');
  });

  it('signOut calls cognito then clears auth', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signOut();
    });

    expect(mockCognito.signOut).toHaveBeenCalled();
    expect(mockClearAuth).toHaveBeenCalled();
  });
});
