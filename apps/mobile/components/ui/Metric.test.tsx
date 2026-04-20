import { render, screen } from '@testing-library/react-native';
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
        color="#000"
        subColor="#666"
      />,
    );

    expect(screen.getByText('Distance')).toBeTruthy();
    expect(screen.getByText('1.42')).toBeTruthy();
    expect(screen.getByText('km')).toBeTruthy();
  });

  it('omits the unit element when no unit is provided', () => {
    render(
      <Metric label="Time" value="24:18" color="#000" subColor="#666" />,
    );

    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('24:18')).toBeTruthy();
    expect(screen.queryByText('km')).toBeNull();
  });
});
