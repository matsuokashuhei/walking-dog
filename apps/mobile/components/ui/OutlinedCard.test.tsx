import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { OutlinedCard } from './OutlinedCard';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('OutlinedCard', () => {
  it('renders children', () => {
    render(
      <OutlinedCard>
        <Text>inside card</Text>
      </OutlinedCard>,
    );
    expect(screen.getByText('inside card')).toBeTruthy();
  });

  it('applies surfaceContainerLowest background and cardBorder color', () => {
    render(
      <OutlinedCard testID="card">
        <Text>x</Text>
      </OutlinedCard>,
    );
    const node = screen.getByTestId('card');
    const styles = (
      Array.isArray(node.props.style) ? node.props.style : [node.props.style]
    ).flat() as Array<Record<string, unknown> | undefined>;
    const flat: Record<string, unknown> = styles.reduce<Record<string, unknown>>(
      (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) => ({
        ...acc,
        ...(s ?? {}),
      }),
      {},
    );
    expect(flat.backgroundColor).toBe('#ffffff');
    expect(flat.borderColor).toBe('rgba(60,60,67,0.12)');
    expect(flat.borderWidth).toBe(1);
  });

  it('accepts a padding prop mapped to spacing token', () => {
    render(
      <OutlinedCard testID="card" padding="lg">
        <Text>x</Text>
      </OutlinedCard>,
    );
    const node = screen.getByTestId('card');
    const styles = (
      Array.isArray(node.props.style) ? node.props.style : [node.props.style]
    ).flat() as Array<Record<string, unknown> | undefined>;
    const flat: Record<string, unknown> = styles.reduce<Record<string, unknown>>(
      (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) => ({
        ...acc,
        ...(s ?? {}),
      }),
      {},
    );
    expect(flat.padding).toBe(24);
  });
});
