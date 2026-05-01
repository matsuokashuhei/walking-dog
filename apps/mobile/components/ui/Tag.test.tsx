import { render, screen } from '@testing-library/react-native';
import { components, tagColors } from '@/theme/tokens';
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
    expect(flat.borderRadius).toBe(components.tag.radius);
  });

  it('renders the live tone with a 6 px pulse dot', () => {
    render(<Tag label="LIVE" tone="live" testID="tag" />);
    expect(screen.getByTestId('tag-dot')).toBeTruthy();
    const dot = flatten(screen.getByTestId('tag-dot').props.style);
    expect(dot.width).toBe(components.tag.dot);
    expect(dot.height).toBe(components.tag.dot);
  });

  it('uses the success tone green background at low alpha', () => {
    render(<Tag label="Done" tone="success" testID="tag" />);
    const flat = flatten(screen.getByTestId('tag').props.style);
    expect(flat.backgroundColor).toBe(tagColors.success.bg);
  });

  it('maps info tone to the tint tag color token', () => {
    render(<Tag label="Info" tone="info" testID="tag" />);
    const flat = flatten(screen.getByTestId('tag').props.style);
    expect(flat.backgroundColor).toBe(tagColors.tint.bg);
  });

  it('maps accent tone to the accent tag color token', () => {
    render(<Tag label="Rare" tone="accent" testID="tag" />);
    const flat = flatten(screen.getByTestId('tag').props.style);
    expect(flat.backgroundColor).toBe(tagColors.accent.bg);
  });
});

type Flat = Record<string, unknown>;
function flatten(style: unknown): Flat {
  const arr = (Array.isArray(style) ? style : [style]).flat() as (Flat | undefined)[];
  return arr.reduce<Flat>((acc, s) => ({ ...acc, ...(s ?? {}) }), {});
}
