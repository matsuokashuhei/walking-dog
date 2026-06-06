import { render, screen } from '@testing-library/react-native';
import WalkRecordingScreen from '../../app/walk-recording';
import type { Dog } from '@/types/graphql';

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: { action?: string; walkId?: string } = {};

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({ data: { dogs: mockDogs } }),
}));

jest.mock('@/hooks/use-walks', () => ({
  useWalk: () => ({ data: null }),
}));

jest.mock('@/hooks/use-walk-live-activity-sync', () => ({
  useWalkLiveActivitySync: jest.fn(),
}));

jest.mock('@/components/walk/WalkMap', () => {
  const { View } = jest.requireActual('react-native');
  return {
    WalkMap: () => <View testID="recording-route-map" />,
  };
});

jest.mock('@/components/walk/WalkMapShell', () => {
  const { View } = jest.requireActual('react-native');
  return {
    WalkMapShell: ({ map }: { map: React.ReactNode }) => (
      <View testID="recording-route-shell">{map}</View>
    ),
  };
});

jest.mock('@/components/walk/WalkTopChip', () => ({
  WalkTopChip: () => null,
}));

type StoreState = {
  phase: 'ready' | 'recording' | 'finished';
  selectedDogIds: string[];
  dogs: Dog[];
  walkId: string | null;
  setTotalDistanceM: (distanceM: number) => void;
  hydrateRecordingSession: (session: unknown) => void;
};

let mockDogs: Dog[] = [];
let mockStoreState: StoreState;

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: StoreState) => unknown) => selector(mockStoreState),
}));

describe('WalkRecordingScreen bridge route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { walkId: 'walk-1' };
    mockDogs = [];
    mockStoreState = {
      phase: 'recording',
      selectedDogIds: ['dog-1'],
      dogs: [],
      walkId: 'walk-1',
      setTotalDistanceM: jest.fn(),
      hydrateRecordingSession: jest.fn(),
    };
  });

  it('redirects active walk deep links back to the Walk tab without rendering recording UI', () => {
    render(<WalkRecordingScreen />);

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(tabs)/walk',
      params: { walkId: 'walk-1' },
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByTestId('recording-route-shell')).toBeNull();
  });

  it('preserves a camera action while bridging back to the Walk tab', () => {
    mockParams = { action: 'camera', walkId: 'walk-1' };

    render(<WalkRecordingScreen />);

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(tabs)/walk',
      params: { action: 'camera', walkId: 'walk-1' },
    });
  });
});
