import { fireEvent, render, screen } from '@testing-library/react-native';
import { GoalProgressCard } from './GoalProgressCard';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('GoalProgressCard', () => {
  it('renders the walking goal summary and progress label', () => {
    render(
      <GoalProgressCard
        title="Goal progress"
        subtitle="20 / 30 min today"
        progressPct={67}
      />,
    );

    expect(screen.getByText('Goal progress')).toBeTruthy();
    expect(screen.getByText('20 / 30 min today')).toBeTruthy();
    expect(screen.getByText('67%')).toBeTruthy();
  });

  it('becomes pressable when onPress is provided', () => {
    const onPress = jest.fn();

    render(
      <GoalProgressCard
        title="Goal progress"
        subtitle="20 / 30 min today"
        progressPct={67}
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Goal progress' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render a button wrapper when onPress is omitted', () => {
    render(
      <GoalProgressCard
        title="Goal progress"
        subtitle="20 / 30 min today"
        progressPct={67}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Goal progress' })).toBeNull();
  });
});
