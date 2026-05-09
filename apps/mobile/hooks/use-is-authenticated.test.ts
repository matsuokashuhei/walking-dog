import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '@/stores/auth-store';
import { useIsAuthenticated } from './use-is-authenticated';

jest.mock('@/lib/auth/api', () => ({
  refreshToken: jest.fn(),
}));
jest.mock('@/lib/auth/bootstrap', () => ({
  bootstrapAuth: jest.fn(),
}));
jest.mock('@/lib/graphql/client', () => ({
  setAuthToken: jest.fn(),
}));

describe('useIsAuthenticated', () => {
  afterEach(() => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: false });
    });
  });

  it('returns false when store isAuthenticated is false', () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: false });
    });

    const { result } = renderHook(() => useIsAuthenticated());
    expect(result.current).toBe(false);
  });

  it('returns true when store isAuthenticated is true', () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: true });
    });

    const { result } = renderHook(() => useIsAuthenticated());
    expect(result.current).toBe(true);
  });

  it('updates when auth state flips', () => {
    act(() => {
      useAuthStore.setState({ isAuthenticated: false });
    });

    const { result } = renderHook(() => useIsAuthenticated());
    expect(result.current).toBe(false);

    act(() => {
      useAuthStore.setState({ isAuthenticated: true });
    });
    expect(result.current).toBe(true);
  });
});
