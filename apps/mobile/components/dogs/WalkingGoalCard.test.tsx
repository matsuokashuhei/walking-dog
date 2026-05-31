import { fireEvent, render, screen } from '@testing-library/react-native';
import { WalkingGoalCard } from './WalkingGoalCard';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('WalkingGoalCard', () => {
  it('renders the walking goal summary and progress label', () => {
    render(
      <WalkingGoalCard
        todayKm={1.42}
        goalKm={5}
        progressPct={28}
        subtitle="1.42 / 5.0 km for Coco"
      />,
    );

    expect(screen.getByText("Today's walking goal")).toBeTruthy();
    expect(screen.getByText('1.42 / 5.0 km for Coco')).toBeTruthy();
    expect(screen.getByText('28%')).toBeTruthy();
  });

  it('becomes pressable when onPress is provided', () => {
    const onPress = jest.fn();

    render(
      <WalkingGoalCard
        todayKm={1.42}
        goalKm={5}
        progressPct={28}
        subtitle="1.42 / 5.0 km for Coco"
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: "Today's walking goal" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render a button wrapper when onPress is omitted', () => {
    render(
      <WalkingGoalCard
        todayKm={1.42}
        goalKm={5}
        progressPct={28}
        subtitle="1.42 / 5.0 km for Coco"
      />,
    );

    expect(screen.queryByRole('button', { name: "Today's walking goal" })).toBeNull();
  });
});
