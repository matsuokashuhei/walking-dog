import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react-native';
import WalkScreen from '../../../app/(tabs)/walk';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-image', () => ({ Image: 'Image' }));

jest.mock('@/components/walk/WalkMap', () => ({ WalkMap: () => null }));
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

type Phase = 'ready' | 'recording' | 'finished';
let mockDogs: Dog[] = [];
let mockPhase: Phase = 'ready';

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({ data: { dogs: mockDogs }, isLoading: false }),
}));

jest.mock('@/hooks/use-pack-progress', () => ({
  usePackProgress: () => ({
    todayKm: 0,
    goalKm: 5,
    progressPct: 0,
    packStreakDays: 0,
    perDog: {},
    isLoading: false,
  }),
}));

type StoreState = {
  selectedDogIds: string[];
  phase: Phase;
  selectDog: (id: string) => void;
  setSelectedDogs: (ids: string[]) => void;
};

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: StoreState) => unknown) =>
    selector({
      selectedDogIds: [],
      phase: mockPhase,
      selectDog: jest.fn(),
      setSelectedDogs: jest.fn(),
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

  it('does not show the Walk header while redirecting to the active walk screen', () => {
    mockPhase = 'recording';
    render(<WalkScreen />);
    expect(screen.queryByRole('header', { name: 'Walk' })).toBeNull();
  });
});
