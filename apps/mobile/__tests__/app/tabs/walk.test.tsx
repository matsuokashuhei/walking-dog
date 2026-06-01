import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react-native';
import WalkScreen from '../../../app/(tabs)/walk';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('expo-router', () => ({
  router: { setParams: jest.fn() },
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-image', () => ({ Image: 'Image' }));

let mockWalkMapMounts = 0;
let mockWalkMapUnmounts = 0;
const mockWalkMapProps: Array<Record<string, unknown>> = [];

jest.mock('@/components/walk/WalkMap', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    WalkMap: (props: Record<string, unknown>) => {
      mockWalkMapProps.push(props);
      React.useEffect(() => {
        mockWalkMapMounts += 1;
        return () => {
          mockWalkMapUnmounts += 1;
        };
      }, []);

      return <View testID="walk-map" />;
    },
  };
});
jest.mock('@/components/walk/WalkMapShell', () => {
  const { View } = jest.requireActual('react-native');
  return {
    WalkMapShell: ({
      map,
      top,
      bottom,
    }: {
      map: ReactNode;
      top: ReactNode;
      bottom: ReactNode;
    }) => (
      <View>
        {map}
        {top}
        {bottom}
      </View>
    ),
  };
});
jest.mock('@/components/walk/WalkSummaryCard', () => ({ WalkSummaryCard: () => null }));
jest.mock('@/components/walk/WalkControls', () => {
  const { Text, View } = jest.requireActual('react-native');
  return {
    WalkControls: ({ children }: { children?: ReactNode }) => (
      <View>
        <Text>Recording controls</Text>
        {children}
      </View>
    ),
  };
});
jest.mock('@/components/walk/WalkEventActions', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    WalkEventActions: () => <Text>Event actions</Text>,
  };
});
jest.mock('@/hooks/use-walk-session', () => ({
  useWalkSession: () => ({ stop: jest.fn() }),
}));
jest.mock('@/hooks/use-active-walk-snapshot-sync', () => ({
  useActiveWalkSnapshotSync: jest.fn(),
}));
jest.mock('@/hooks/use-walk-live-activity-sync', () => ({
  useWalkLiveActivitySync: jest.fn(),
}));

type Phase = 'ready' | 'recording' | 'finished';
let mockDogs: Dog[] = [];
let mockPhase: Phase = 'ready';
let mockSelectedDogIds: string[] = [];

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({ data: { dogs: mockDogs }, isLoading: false }),
}));

jest.mock('@/hooks/use-pack-progress', () => ({
  usePackProgress: () => ({
    todayKm: 0,
    todayMinutes: 0,
    goalProgressMinutes: 0,
    goalMinutes: 30,
    progressPct: 0,
    packStreakDays: 0,
    perDog: {},
    isLoading: false,
  }),
}));

type StoreState = {
  selectedDogIds: string[];
  phase: Phase;
  dogs: Dog[];
  walkId: string | null;
  selectDog: (id: string) => void;
  setSelectedDogs: (ids: string[]) => void;
  requestCamera: () => void;
};

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: StoreState) => unknown) =>
    selector({
      selectedDogIds: mockSelectedDogIds,
      phase: mockPhase,
      dogs: mockDogs,
      walkId: mockPhase === 'recording' ? 'walk-1' : null,
      selectDog: jest.fn(),
      setSelectedDogs: jest.fn(),
      requestCamera: jest.fn(),
    }),
}));

jest.mock('@/hooks/use-walk-screen-view-model', () => ({
  useWalkScreenViewModel: () => ({
    phase: mockPhase,
    isStarting: false,
    handleStart: jest.fn(),
  }),
}));

const buildDog = (overrides: Partial<Dog>): Dog =>
  ({
    id: 'd1',
    name: 'Coco',
    breed: 'Toy Poodle',
    gender: null,
    birthday: null,
    photoUrl: null,
    createdAt: '2026-01-01',
    ...overrides,
  }) as Dog;

describe('Walk tab route', () => {
  beforeEach(() => {
    mockDogs = [];
    mockPhase = 'ready';
    mockSelectedDogIds = [];
    mockWalkMapMounts = 0;
    mockWalkMapUnmounts = 0;
    mockWalkMapProps.length = 0;
  });

  it('shows the NoDogsBody CTA when there are zero dogs', () => {
    mockDogs = [];
    render(<WalkScreen />);
    expect(screen.queryByRole('header', { name: 'Walk' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add your first dog' })).toBeTruthy();
  });

  it('shows the START WALK button for a single dog', () => {
    mockDogs = [buildDog({})];
    render(<WalkScreen />);
    expect(screen.getByRole('button', { name: 'START WALK' })).toBeTruthy();
  });

  it('shows the Walking with section header for 2+ dogs', () => {
    mockDogs = [buildDog({}), buildDog({ id: 'd2', name: 'Momo' })];
    render(<WalkScreen />);
    expect(screen.getByText('Walking with')).toBeTruthy();
  });

  it('renders recording controls in the Walk tab instead of an empty redirect placeholder', () => {
    mockPhase = 'recording';
    mockDogs = [buildDog({})];
    mockSelectedDogIds = ['d1'];

    render(<WalkScreen />);

    expect(screen.queryByRole('header', { name: 'Walk' })).toBeNull();
    expect(screen.getByText('Recording controls')).toBeTruthy();
    expect(screen.getByText('Event actions')).toBeTruthy();
  });

  it('keeps the same map mounted when the phase changes from ready to recording', () => {
    mockDogs = [buildDog({})];
    mockSelectedDogIds = ['d1'];
    const { rerender } = render(<WalkScreen />);

    expect(screen.getByTestId('walk-map')).toBeTruthy();
    expect(mockWalkMapMounts).toBe(1);
    expect(mockWalkMapProps.at(-1)).toEqual(expect.objectContaining({ mode: 'preview' }));

    mockPhase = 'recording';
    rerender(<WalkScreen />);

    expect(screen.getByText('Recording controls')).toBeTruthy();
    expect(mockWalkMapMounts).toBe(1);
    expect(mockWalkMapUnmounts).toBe(0);
    expect(mockWalkMapProps.at(-1)).toEqual(expect.objectContaining({ mode: 'recording' }));
  });
});
