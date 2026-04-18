import { fireEvent, render, screen } from '@testing-library/react-native';
import { WalkSummaryCard } from './WalkSummaryCard';

const mockReset = jest.fn();
const mockPush = jest.fn();

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: object) => unknown) =>
    selector({
      walkId: 'walk-1',
      startedAt: new Date('2026-04-18T08:30:00Z'),
      totalDistanceM: 1420,
      events: [
        { id: 'e1', eventType: 'pee' },
        { id: 'e2', eventType: 'pee' },
        { id: 'e3', eventType: 'poo' },
        { id: 'e4', eventType: 'photo' },
        { id: 'e5', eventType: 'photo' },
        { id: 'e6', eventType: 'photo' },
      ],
      reset: mockReset,
    }),
}));

jest.mock('@/lib/walk/format', () => ({
  formatTime: (sec: number) =>
    `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`,
  formatDistance: (m: number) => `${(m / 1000).toFixed(2)} km`,
}));

describe('WalkSummaryCard', () => {
  beforeEach(() => {
    mockReset.mockClear();
    mockPush.mockClear();
  });

  it('renders the Precise WALK COMPLETE caption', () => {
    render(<WalkSummaryCard />);
    expect(screen.getByText('WALK COMPLETE')).toBeTruthy();
  });

  it('renders the Save walk primary action', () => {
    render(<WalkSummaryCard />);
    expect(screen.getByRole('button', { name: 'Save walk' })).toBeTruthy();
  });

  it('renders the Add note secondary action', () => {
    render(<WalkSummaryCard />);
    expect(screen.getByRole('button', { name: 'Add note' })).toBeTruthy();
  });

  it('pressing Save walk resets the store AND navigates — prevents the "stuck on Walk Complete" regression', () => {
    render(<WalkSummaryCard />);
    fireEvent.press(screen.getByRole('button', { name: 'Save walk' }));
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/walks/walk-1');
  });

  it('renders a distance metric row', () => {
    render(<WalkSummaryCard />);
    expect(screen.getByText('Distance')).toBeTruthy();
    expect(screen.getByText('1.42 km')).toBeTruthy();
  });

  it('renders event tag pills with counts', () => {
    render(<WalkSummaryCard />);
    expect(screen.getByText('💩 1')).toBeTruthy();
    expect(screen.getByText('💧 2')).toBeTruthy();
    expect(screen.getByText('📷 3')).toBeTruthy();
  });
});
