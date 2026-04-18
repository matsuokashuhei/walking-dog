import { render, screen } from '@testing-library/react-native';
import { SectionHeader } from './SectionHeader';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('SectionHeader', () => {
  it('renders label text', () => {
    render(<SectionHeader label="Your pack" />);
    expect(screen.getByText('Your pack')).toBeTruthy();
  });

  it('applies the Precise caption typography', () => {
    render(<SectionHeader label="Legal" testID="header" />);
    const node = screen.getByTestId('header');
    const flat = flatten(node.props.style);
    expect(flat.textTransform).toBe('uppercase');
    expect(flat.fontSize).toBe(12);
  });
});

type Flat = Record<string, unknown>;
function flatten(style: unknown): Flat {
  const arr = (Array.isArray(style) ? style : [style]).flat() as Array<
    Flat | undefined
  >;
  return arr.reduce<Flat>((acc, s) => ({ ...acc, ...(s ?? {}) }), {});
}
