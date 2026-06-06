import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { WalkMinimizedControls } from './WalkMinimizedControls';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: 'IconSymbol' }));

const mockExpand = jest.fn();
const mockWalkStoreState = {
  startedAt: null as Date | null,
  totalDistanceM: 1420,
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
  birthday: null,
  photoUrl: null,
  createdAt: '2026-01-01',
};

describe('WalkMinimizedControls', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockExpand.mockClear();
    mockWalkStoreState.startedAt = null;
    mockWalkStoreState.totalDistanceM = 1420;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders distance and LIVE', () => {
    render(<WalkMinimizedControls dogs={[coco]} onExpand={mockExpand} />);
    expect(screen.getByText(/1420m/)).toBeTruthy();
    expect(screen.getByText('LIVE')).toBeTruthy();
  });

  it('keeps the expand hint accessible without rendering extra map text', () => {
    render(<WalkMinimizedControls dogs={[coco]} onExpand={mockExpand} />);
    expect(screen.queryByText('Tap to expand for controls')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand' })).toHaveProp(
      'accessibilityHint',
      'Tap to expand for controls',
    );
  });

  it('calls onExpand when the pill is tapped', () => {
    render(<WalkMinimizedControls dogs={[coco]} onExpand={mockExpand} />);
    fireEvent.press(screen.getByRole('button', { name: 'Expand' }));
    expect(mockExpand).toHaveBeenCalledTimes(1);
  });

  it('updates the elapsed label while recording', () => {
    jest.setSystemTime(new Date('2026-04-20T10:00:00.000Z'));
    mockWalkStoreState.startedAt = new Date('2026-04-20T09:59:56.000Z');

    render(<WalkMinimizedControls dogs={[coco]} onExpand={mockExpand} />);
    expect(screen.getByText('4s')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2_000);
    });

    expect(screen.getByText('6s')).toBeTruthy();
  });
});
