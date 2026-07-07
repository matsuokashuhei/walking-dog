import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
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
jest.mock('@/components/walk/WalkControls', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    WalkControls: ({
      children,
      onMinimize,
    }: {
      children?: ReactNode;
      onMinimize?: () => void;
    }) => (
      <View>
        <Text>Recording controls</Text>
        {onMinimize ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Minimize"
            onPress={onMinimize}
          >
            <Text>Minimize</Text>
          </Pressable>
        ) : null}
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
let mockIsMinimized = false;
const mockSetMinimized = jest.fn((next: boolean) => {
  mockIsMinimized = next;
});

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
  startedAt: Date | null;
  totalDistanceM: number;
  isMinimized: boolean;
  selectDog: (id: string) => void;
  setSelectedDogs: (ids: string[]) => void;
  setMinimized: (next: boolean) => void;
  requestCamera: () => void;
};

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: StoreState) => unknown) =>
    selector({
      selectedDogIds: mockSelectedDogIds,
      phase: mockPhase,
      dogs: mockDogs,
      walkId: mockPhase === 'recording' ? 'walk-1' : null,
      startedAt: new Date('2026-04-20T10:00:00.000Z'),
      totalDistanceM: 240,
      isMinimized: mockIsMinimized,
      selectDog: jest.fn(),
      setSelectedDogs: jest.fn(),
      setMinimized: mockSetMinimized,
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
    mockIsMinimized = false;
    mockSetMinimized.mockClear();
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

  it('collapses recording controls in the Walk tab without showing event actions', () => {
    mockPhase = 'recording';
    mockDogs = [buildDog({})];
    mockSelectedDogIds = ['d1'];

    const { rerender } = render(<WalkScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Minimize' }));
    rerender(<WalkScreen />);

    expect(mockSetMinimized).toHaveBeenCalledWith(true);
    expect(screen.queryByText('Recording controls')).toBeNull();
    expect(screen.queryByText('Event actions')).toBeNull();
    expect(screen.queryByText('Tap to expand for controls')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand' })).toHaveProp(
      'accessibilityHint',
      'Tap to expand for controls',
    );

    fireEvent.press(screen.getByRole('button', { name: 'Expand' }));
    rerender(<WalkScreen />);

    expect(mockSetMinimized).toHaveBeenCalledWith(false);
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

  it('does not render the post-walk summary screen after the walk is finished', () => {
    mockPhase = 'finished';
    mockDogs = [buildDog({})];
    mockSelectedDogIds = ['d1'];

    render(<WalkScreen />);

    expect(screen.queryByRole('header', { name: 'Walk' })).toBeNull();
    expect(screen.queryByText('Recording controls')).toBeNull();
    expect(screen.queryByRole('button', { name: 'START WALK' })).toBeNull();
  });
});
