import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useWalkFinishedNavigation } from './use-walk-finished-navigation';
import { useWalkStore } from '@/stores/walk-store';

jest.mock('expo-router', () => ({
  router: {
    dismissTo: jest.fn(),
  },
}));

describe('useWalkFinishedNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWalkStore.getState().reset();
  });

  it('dismisses to the walk tab when a recording walk finishes', () => {
    useWalkStore.getState().startRecording('walk-1');
    const { rerender } = renderHook(() => useWalkFinishedNavigation());

    act(() => {
      useWalkStore.getState().finish();
    });
    rerender({});

    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/walk');
  });

  it('does not dismiss when the app starts in the finished phase', () => {
    useWalkStore.setState({ phase: 'finished' });

    renderHook(() => useWalkFinishedNavigation());

    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('dismisses only once for a single finished transition', () => {
    useWalkStore.getState().startRecording('walk-1');
    const { rerender } = renderHook(() => useWalkFinishedNavigation());

    act(() => {
      useWalkStore.getState().finish();
    });
    rerender({});
    rerender({});

    expect(router.dismissTo).toHaveBeenCalledTimes(1);
  });
});
