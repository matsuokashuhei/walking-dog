import { act, renderHook, waitFor } from '@testing-library/react-native';
import { addUserInteractionListener } from 'expo-widgets';
import { useWalkLiveActivityInteractions } from './use-walk-live-activity-interactions';
import { walkActivityEventTarget } from '@/lib/walk/live-activity';
import { useWalkStore } from '@/stores/walk-store';

const mockRemoveSubscription = jest.fn();
const mockRecordEvent = jest.fn();
const mockStopWalk = jest.fn();

let mockInteractionListener: Parameters<typeof addUserInteractionListener>[0] | null = null;

jest.mock('expo-widgets', () => ({
  addUserInteractionListener: jest.fn((listener) => {
    mockInteractionListener = listener;
    return { remove: mockRemoveSubscription };
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    dismissTo: jest.fn(),
  },
}));

jest.mock('@/hooks/use-commit-walk-event', () => ({
  useCommitWalkEvent: () => async (operation: () => Promise<void>) => operation(),
}));

jest.mock('@/hooks/use-walk-event-recorder', () => ({
  useWalkEventRecorder: () => ({
    recordEvent: mockRecordEvent,
  }),
}));

jest.mock('@/hooks/use-walk-session', () => ({
  useWalkSession: () => ({
    stop: mockStopWalk,
  }),
}));

describe('useWalkLiveActivityInteractions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInteractionListener = null;
    useWalkStore.getState().reset();
    useWalkStore.getState().startRecording('walk-1');
  });

  it('handles native Live Activity button events whose source is the activity id', async () => {
    renderHook(() => useWalkLiveActivityInteractions());

    await act(async () => {
      mockInteractionListener?.({
        source: 'native-live-activity-id',
        target: walkActivityEventTarget('pee', 'dog-1'),
        timestamp: Date.now(),
        type: 'ExpoWidgetsUserInteraction',
      });
    });

    await waitFor(() => {
      expect(mockRecordEvent).toHaveBeenCalledWith('pee', 'dog-1');
    });
  });

  it('removes the Expo Widgets interaction subscription on unmount', () => {
    const { unmount } = renderHook(() => useWalkLiveActivityInteractions());

    unmount();

    expect(mockRemoveSubscription).toHaveBeenCalledTimes(1);
  });
});
