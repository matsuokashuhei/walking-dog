import { act, renderHook } from '@testing-library/react-native';
import { useSettingsScreenViewModel } from './use-settings-screen-view-model';

const mockRefetch = jest.fn();

let mockMe:
  | {
      id: string;
      displayName: string | null;
      avatarUrl: string | null;
    }
  | undefined = {
  id: 'user-1',
  displayName: 'Mio',
  avatarUrl: null,
};
let mockIsLoading = false;
let mockError: Error | null = null;

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({
    data: mockMe,
    isLoading: mockIsLoading,
    error: mockError,
    refetch: mockRefetch,
  }),
}));

describe('useSettingsScreenViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMe = { id: 'user-1', displayName: 'Mio', avatarUrl: null };
    mockIsLoading = false;
    mockError = null;
  });

  it('returns loading while the me query is pending', () => {
    mockIsLoading = true;

    const { result } = renderHook(() => useSettingsScreenViewModel());

    expect(result.current.status).toBe('loading');
  });

  it('returns an error state when the me query fails or returns no user', () => {
    mockError = new Error('load failed');
    const failed = renderHook(() => useSettingsScreenViewModel());
    expect(failed.result.current.status).toBe('error');

    mockError = null;
    mockMe = undefined;
    const missing = renderHook(() => useSettingsScreenViewModel());
    expect(missing.result.current.status).toBe('error');
  });

  it('returns ready data and a retry handler when the user is available', () => {
    const { result } = renderHook(() => useSettingsScreenViewModel());

    expect(result.current.status).toBe('ready');
    if (result.current.status !== 'ready') {
      throw new Error('Expected ready settings view model');
    }

    expect(result.current.me.displayName).toBe('Mio');

    act(() => {
      result.current.handleRetry();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
