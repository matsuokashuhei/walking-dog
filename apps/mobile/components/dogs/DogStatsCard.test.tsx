import { render, screen } from '@testing-library/react-native';
import { DogStatsCard } from './DogStatsCard';
import type { WalkStats } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

const stats: WalkStats = {
  totalWalks: 12,
  totalDistanceM: 2530,
  totalDurationSec: 7200,
};

describe('DogStatsCard', () => {
  it('renders walk count, total distance, and streak values', () => {
    render(<DogStatsCard stats={stats} streakDays={5} />);

    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('2.5 km')).toBeTruthy();
    expect(screen.getByText('5d')).toBeTruthy();
    expect(screen.getByText('Walks')).toBeTruthy();
    expect(screen.getByText('Distance')).toBeTruthy();
    expect(screen.getByText('Streak')).toBeTruthy();
  });

  it('defaults streak days to zero when not provided', () => {
    render(<DogStatsCard stats={stats} />);

    expect(screen.getByText('0d')).toBeTruthy();
  });
});
