import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { WalkMinimizedControls } from './WalkMinimizedControls';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({ Image: 'Image' }));

const mockSetMinimized = jest.fn();
const mockWalkStoreState = {
  startedAt: null as Date | null,
  isPaused: false,
  totalPausedMs: 0,
  pauseStartedAtMs: null as number | null,
  totalDistanceM: 1420,
  setMinimized: mockSetMinimized,
};

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: typeof mockWalkStoreState) => unknown) =>
    selector(mockWalkStoreState),
}));

jest.mock('@/lib/walk/format', () => ({
  formatTime: (sec: number) => `${sec}s`,
  formatDistance: (m: number) => `${m}m`,
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

describe('WalkMinimizedControls', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSetMinimized.mockClear();
    mockWalkStoreState.startedAt = null;
    mockWalkStoreState.isPaused = false;
    mockWalkStoreState.totalPausedMs = 0;
    mockWalkStoreState.pauseStartedAtMs = null;
    mockWalkStoreState.totalDistanceM = 1420;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders distance and LIVE', () => {
    render(<WalkMinimizedControls dogs={[coco]} />);
    expect(screen.getByText(/1420m/)).toBeTruthy();
    expect(screen.getByText('LIVE')).toBeTruthy();
  });

  it('renders the expand hint', () => {
    render(<WalkMinimizedControls dogs={[coco]} />);
    expect(screen.getByText('Tap to expand for controls')).toBeTruthy();
  });

  it('calls setMinimized(false) when the pill is tapped', () => {
    render(<WalkMinimizedControls dogs={[coco]} />);
    fireEvent.press(screen.getByRole('button', { name: 'Expand' }));
    expect(mockSetMinimized).toHaveBeenCalledWith(false);
  });

  it('updates the elapsed label while recording', () => {
    jest.setSystemTime(new Date('2026-04-20T10:00:00.000Z'));
    mockWalkStoreState.startedAt = new Date('2026-04-20T09:59:56.000Z');

    render(<WalkMinimizedControls dogs={[coco]} />);
    expect(screen.getByText('4s')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2_000);
    });

    expect(screen.getByText('6s')).toBeTruthy();
  });
});
