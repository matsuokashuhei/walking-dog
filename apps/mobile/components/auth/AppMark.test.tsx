import { render, screen } from '@testing-library/react-native';
import { radius, shadow } from '@/theme/tokens';
import { AppMark } from './AppMark';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Path: 'Path',
}));

describe('AppMark', () => {
  it('exposes an accessible image role with the app name as label', () => {
    render(<AppMark />);
    expect(screen.getByRole('image', { name: /walking dog/i })).toBeTruthy();
  });

  it('uses the shared app-mark radius and primary glow shadow tokens', () => {
    render(<AppMark />);
    const flat = flatten(screen.getByRole('image', { name: /walking dog/i }).props.style);

    expect(flat.borderRadius).toBe(radius.appMark);
    expect(flat.shadowColor).toBe(shadow.primary);
  });
});

type Flat = Record<string, unknown>;

function flatten(style: unknown): Flat {
  const arr = (Array.isArray(style) ? style : [style]).flat() as (Flat | undefined)[];
  return arr.reduce<Flat>((acc, item) => ({ ...acc, ...(item ?? {}) }), {});
}
