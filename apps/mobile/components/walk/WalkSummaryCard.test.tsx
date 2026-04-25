import { fireEvent, render, screen } from '@testing-library/react-native';
import { WalkSummaryCard } from './WalkSummaryCard';
import type { Dog, WalkEvent } from '@/types/graphql';

const mockReset = jest.fn();
const mockPush = jest.fn();
let mockSelectedDogIds: string[] = ['dog-1'];
let mockDogs: Dog[] = [];
let mockEvents: WalkEvent[] = [];

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({ Image: 'Image' }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('react-native-maps', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const Mock = ({
    children,
    testID,
    accessibilityLabel,
  }: {
    children?: React.ReactNode;
    testID?: string;
    accessibilityLabel?: string;
  }) => React.createElement(View, { testID, accessibilityLabel }, children);
  return {
    __esModule: true,
    default: Mock,
    Marker: Mock,
    Polyline: Mock,
  };
});

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({ data: { dogs: mockDogs } }),
}));

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: object) => unknown) =>
    selector({
      walkId: 'walk-1',
      startedAt: new Date(Date.now() - 24 * 60 * 1000),
      totalDistanceM: 1420,
      points: [
        { lat: 35.6812, lng: 139.7671, recordedAt: '2026-04-19T10:00:00Z' },
        { lat: 35.682, lng: 139.768, recordedAt: '2026-04-19T10:05:00Z' },
      ],
      events: mockEvents,
      selectedDogIds: mockSelectedDogIds,
      reset: mockReset,
    }),
}));

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: null,
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-01',
};

const momo: Dog = { ...coco, id: 'dog-2', name: 'Momo' };

describe('WalkSummaryCard', () => {
  beforeEach(() => {
    mockReset.mockClear();
    mockPush.mockClear();
    mockSelectedDogIds = ['dog-1'];
    mockDogs = [coco];
    mockEvents = [];
  });

  it('renders the WALK COMPLETE caption', () => {
    render(<WalkSummaryCard />);
    expect(screen.getByText('WALK COMPLETE')).toBeTruthy();
  });

  it('renders single-dog title and saved-to-history note when one dog is selected', () => {
    mockDogs = [coco];
    mockSelectedDogIds = ['dog-1'];
    render(<WalkSummaryCard />);
    expect(screen.getByText('Nice walk, Coco!')).toBeTruthy();
    expect(screen.getByText("Saved to Coco's history")).toBeTruthy();
  });

  it('hides the Per dog card in single-dog mode', () => {
    mockDogs = [coco];
    mockSelectedDogIds = ['dog-1'];
    render(<WalkSummaryCard />);
    expect(screen.queryByText('Per dog')).toBeNull();
  });

  it('renders multi-dog title, Per dog card, and both-history note', () => {
    mockDogs = [coco, momo];
    mockSelectedDogIds = ['dog-1', 'dog-2'];
    render(<WalkSummaryCard />);
    expect(screen.getByText('Nice walk, everyone.')).toBeTruthy();
    expect(screen.getByText('Per dog')).toBeTruthy();
    expect(screen.getByText("Saved to both Coco's and Momo's history")).toBeTruthy();
  });

  it('pressing Save walk resets the store and navigates to the walk detail', () => {
    render(<WalkSummaryCard />);
    fireEvent.press(screen.getByRole('button', { name: 'Save walk' }));
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/walks/walk-1');
  });

  it('renders the Add note secondary action without crashing when no handler is wired', () => {
    render(<WalkSummaryCard />);
    const addNote = screen.getByRole('button', { name: 'Add note' });
    expect(addNote).toBeTruthy();
    expect(() => fireEvent.press(addNote)).not.toThrow();
  });

  it('shows the three route-preview metrics', () => {
    render(<WalkSummaryCard />);
    expect(screen.getByText('1.42 km')).toBeTruthy();
    expect(screen.getByText('24:00')).toBeTruthy();
    expect(screen.getByText(/\d+'\d{2}"\/km/)).toBeTruthy();
  });
});
