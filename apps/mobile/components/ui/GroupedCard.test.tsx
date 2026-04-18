import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GroupedCard } from './GroupedCard';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('GroupedCard', () => {
  it('renders children', () => {
    render(
      <GroupedCard>
        <Text>row contents</Text>
      </GroupedCard>,
    );
    expect(screen.getByText('row contents')).toBeTruthy();
  });

  it('uses Precise card radius (16) and white surface, no border', () => {
    render(
      <GroupedCard testID="card">
        <Text>x</Text>
      </GroupedCard>,
    );
    const flat = flatten(screen.getByTestId('card').props.style);
    expect(flat.borderRadius).toBe(16);
    expect(flat.backgroundColor).toBe('#ffffff');
    expect(flat.borderWidth ?? 0).toBe(0);
  });

  it('defaults to zero padding so GroupedRow can own vertical spacing', () => {
    render(
      <GroupedCard testID="card">
        <Text>x</Text>
      </GroupedCard>,
    );
    const flat = flatten(screen.getByTestId('card').props.style);
    expect(flat.padding ?? 0).toBe(0);
  });

  it('accepts a padding prop mapped to spacing tokens', () => {
    render(
      <GroupedCard testID="card" padding="lg">
        <Text>x</Text>
      </GroupedCard>,
    );
    const flat = flatten(screen.getByTestId('card').props.style);
    expect(flat.padding).toBe(24);
  });
});

type Flat = Record<string, unknown>;
function flatten(style: unknown): Flat {
  const arr = (Array.isArray(style) ? style : [style]).flat() as Array<
    Flat | undefined
  >;
  return arr.reduce<Flat>((acc, s) => ({ ...acc, ...(s ?? {}) }), {});
}
