import { fireEvent, render, screen } from '@testing-library/react-native';
import { PackRollupCard } from './PackRollupCard';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('PackRollupCard', () => {
  it('renders the walking goal summary and progress label', () => {
    render(<PackRollupCard progressMinutes={45} goalMinutes={90} progressPct={50} />);

    expect(screen.getByText('Goal progress')).toBeTruthy();
    expect(screen.getByText('45 / 90 min across your pack')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('becomes pressable when onPress is provided', () => {
    const onPress = jest.fn();

    render(
      <PackRollupCard progressMinutes={45} goalMinutes={90} progressPct={50} onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Goal progress' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render a button wrapper when onPress is omitted', () => {
    render(<PackRollupCard progressMinutes={45} goalMinutes={90} progressPct={50} />);

    expect(screen.queryByRole('button', { name: 'Goal progress' })).toBeNull();
  });
});
