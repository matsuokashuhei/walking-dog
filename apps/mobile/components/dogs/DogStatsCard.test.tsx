import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { DogStatsCard } from './DogStatsCard';
import { colors, elevation, spacing } from '@/theme/tokens';
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

  it('renders as an elevated grouped card with row layout and light surface', () => {
    render(<DogStatsCard stats={stats} />);

    const card = screen.getByTestId('dog-stats-card');
    const style = StyleSheet.flatten(card.props.style);

    expect(style.flexDirection).toBe('row');
    expect(style.paddingVertical).toBe(spacing.step14);
    expect(style.paddingHorizontal).toBe(spacing.xs);
    expect(style.backgroundColor).toBe(colors.light.surface);
    expect(style.borderWidth).toBeUndefined();
    expect(style.shadowOpacity).toBe(elevation.low.shadowOpacity);
    expect(style.elevation).toBe(elevation.low.elevation);
  });

  it('renders two vertical dividers between stat columns', () => {
    render(<DogStatsCard stats={stats} />);

    const dividers = screen.getAllByTestId('dog-stats-card-divider');

    expect(dividers).toHaveLength(2);
    for (const divider of dividers) {
      const style = StyleSheet.flatten(divider.props.style);
      expect(style.width).toBe(StyleSheet.hairlineWidth);
      expect(style.backgroundColor).toBe(colors.light.border);
      expect(style.marginVertical).toBe(spacing.xs);
    }
  });
});
