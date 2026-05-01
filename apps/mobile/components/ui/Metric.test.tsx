import { render, screen } from '@testing-library/react-native';
import { colors, components } from '@/theme/tokens';
import { Metric } from './Metric';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('Metric', () => {
  it('renders label, value, and unit', () => {
    render(
      <Metric
        label="Distance"
        value="1.42"
        unit="km"
        color={colors.light.onSurface}
        subColor={colors.light.onSurfaceVariant}
      />,
    );

    expect(screen.getByText('Distance')).toBeTruthy();
    expect(screen.getByText('1.42')).toBeTruthy();
    expect(screen.getByText('km')).toBeTruthy();
  });

  it('omits the unit element when no unit is provided', () => {
    render(
      <Metric
        label="Time"
        value="24:18"
        color={colors.light.onSurface}
        subColor={colors.light.onSurfaceVariant}
      />,
    );

    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('24:18')).toBeTruthy();
    expect(screen.queryByText('km')).toBeNull();
  });

  it('styles the value from the metric component token', () => {
    render(
      <Metric
        label="Distance"
        value="1.42"
        unit="km"
        color={colors.light.onSurface}
        subColor={colors.light.onSurfaceVariant}
      />,
    );

    const flat = flatten(screen.getByText('1.42').props.style);
    expect(flat.fontSize).toBe(components.metric.value.fontSize);
    expect(flat.letterSpacing).toBe(components.metric.value.letterSpacing);
  });
});

type Flat = Record<string, unknown>;
function flatten(style: unknown): Flat {
  const arr = (Array.isArray(style) ? style : [style]).flat() as (Flat | undefined)[];
  return arr.reduce<Flat>((acc, s) => ({ ...acc, ...(s ?? {}) }), {});
}
