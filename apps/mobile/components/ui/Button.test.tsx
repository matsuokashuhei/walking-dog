import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './Button';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('Button', () => {
  it('renders label', () => {
    render(<Button label="Save" />);
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} loading />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('hides label text when loading', () => {
    render(<Button label="Save" loading />);
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('reports disabled state via accessibilityState when loading', () => {
    render(<Button label="Save" loading />);
    const node = screen.getByRole('button', { name: 'Save' });
    expect(node.props.accessibilityState?.disabled).toBe(true);
  });
});
