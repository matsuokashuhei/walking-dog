import { render, screen } from '@testing-library/react-native';
import { Tag } from './Tag';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('Tag', () => {
  it('renders label text', () => {
    render(<Tag label="Morning" />);
    expect(screen.getByText('Morning')).toBeTruthy();
  });

  it('applies the Precise pill radius (100)', () => {
    render(<Tag label="x" testID="tag" />);
    const flat = flatten(screen.getByTestId('tag').props.style);
    expect(flat.borderRadius).toBe(100);
  });

  it('renders the live tone with a 6 px pulse dot', () => {
    render(<Tag label="LIVE" tone="live" testID="tag" />);
    expect(screen.getByTestId('tag-dot')).toBeTruthy();
    const dot = flatten(screen.getByTestId('tag-dot').props.style);
    expect(dot.width).toBe(6);
    expect(dot.height).toBe(6);
  });

  it('uses the success tone green background at low alpha', () => {
    render(<Tag label="Done" tone="success" testID="tag" />);
    const flat = flatten(screen.getByTestId('tag').props.style);
    expect(flat.backgroundColor).toBe('rgba(48,209,88,0.14)');
  });
});

type Flat = Record<string, unknown>;
function flatten(style: unknown): Flat {
  const arr = (Array.isArray(style) ? style : [style]).flat() as Array<
    Flat | undefined
  >;
  return arr.reduce<Flat>((acc, s) => ({ ...acc, ...(s ?? {}) }), {});
}
