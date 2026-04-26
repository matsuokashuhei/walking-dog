import { fireEvent, render, screen } from '@testing-library/react-native';
import { WalkStartButton } from './WalkStartButton';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));

describe('WalkStartButton', () => {
  it('renders the START WALK label', () => {
    render(<WalkStartButton onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'START WALK' })).toBeTruthy();
  });

  it('calls onPress when enabled and pressed', () => {
    const onPress = jest.fn();
    render(<WalkStartButton onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'START WALK' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reports disabled state via accessibility', () => {
    render(<WalkStartButton onPress={jest.fn()} disabled />);
    expect(
      screen.getByRole('button', { name: 'START WALK' }).props.accessibilityState.disabled,
    ).toBe(true);
  });

  it('does NOT call onPress while loading', () => {
    const onPress = jest.fn();
    render(<WalkStartButton onPress={onPress} loading />);
    fireEvent.press(screen.getByRole('button', { name: 'START WALK' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
