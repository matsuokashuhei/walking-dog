import { fireEvent, render, screen } from '@testing-library/react-native';
import { PackRollupCard } from './PackRollupCard';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('PackRollupCard', () => {
  it('renders the walking goal summary and progress label', () => {
    render(<PackRollupCard todayKm={1.42} goalKm={5} progressPct={28} />);

    expect(screen.getByText("Today's walking goal")).toBeTruthy();
    expect(screen.getByText('1.42 / 5.0 km across your pack')).toBeTruthy();
    expect(screen.getByText('28%')).toBeTruthy();
  });

  it('becomes pressable when onPress is provided', () => {
    const onPress = jest.fn();

    render(
      <PackRollupCard todayKm={1.42} goalKm={5} progressPct={28} onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', { name: "Today's walking goal" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render a button wrapper when onPress is omitted', () => {
    render(<PackRollupCard todayKm={1.42} goalKm={5} progressPct={28} />);

    expect(screen.queryByRole('button', { name: "Today's walking goal" })).toBeNull();
  });
});
