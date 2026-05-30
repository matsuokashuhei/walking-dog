import { render, screen } from '@testing-library/react-native';
import { WalkReadyStatsRow } from './WalkReadyStatsRow';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('@/hooks/use-pack-progress', () => ({
  usePackProgress: () => ({
    todayKm: 3.52,
    todayMinutes: 45,
    goalMinutes: 90,
    progressPct: 50,
    packStreakDays: 12,
    perDog: {},
    isLoading: false,
  }),
}));

describe('WalkReadyStatsRow', () => {
  it('renders Today / Streak / Goal labels and values', () => {
    render(<WalkReadyStatsRow />);
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('3.52 km')).toBeTruthy();
    expect(screen.getByText('Streak')).toBeTruthy();
    expect(screen.getByText(/12d/)).toBeTruthy();
    expect(screen.getByText('Goal')).toBeTruthy();
    expect(screen.getByText('45/90 min')).toBeTruthy();
  });
});
