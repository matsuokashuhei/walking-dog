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

  it('renders success variant with the Precise green fill', () => {
    render(<Button label="Start" variant="success" />);
    const node = screen.getByRole('button', { name: 'Start' });
    const flat = flattenStyle(node.props.style);
    expect(flat.backgroundColor).toBe('#30d158');
  });

  it('applies the Precise circle size — 200×200 with half radius', () => {
    render(<Button label="START" size="circle" variant="success" />);
    const node = screen.getByRole('button', { name: 'START' });
    const flat = flattenStyle(node.props.style);
    expect(flat.width).toBe(200);
    expect(flat.height).toBe(200);
    expect(flat.borderRadius).toBe(100);
  });

  it('applies the default (Precise 50 px) height when size is omitted', () => {
    render(<Button label="Save walk" />);
    const node = screen.getByRole('button', { name: 'Save walk' });
    const flat = flattenStyle(node.props.style);
    expect(flat.height).toBe(50);
  });

  it('renders apple variant with black fill in light mode', () => {
    render(<Button label="Continue with Apple" variant="apple" />);
    const node = screen.getByRole('button', { name: 'Continue with Apple' });
    const flat = flattenStyle(node.props.style);
    expect(flat.backgroundColor).toBe('#000000');
  });
});

type Flat = Record<string, unknown>;
function flattenStyle(style: unknown): Flat {
  const arr = (Array.isArray(style) ? style : [style]).flat() as Array<Flat | undefined>;
  return arr.reduce<Flat>((acc, s) => ({ ...acc, ...(s ?? {}) }), {});
}
