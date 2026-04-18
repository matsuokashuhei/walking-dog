import { fireEvent, render, screen } from '@testing-library/react-native';
import { WalkMinimizedControls } from './WalkMinimizedControls';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({ Image: 'Image' }));

const mockSetMinimized = jest.fn();

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: object) => unknown) =>
    selector({
      startedAt: null,
      totalDistanceM: 1420,
      setMinimized: mockSetMinimized,
    }),
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
    mockSetMinimized.mockClear();
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
});
