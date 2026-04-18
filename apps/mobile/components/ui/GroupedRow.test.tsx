import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GroupedRow } from './GroupedRow';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('GroupedRow', () => {
  it('renders label and trailing value', () => {
    render(<GroupedRow label="Language" value="English" />);
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
  });

  it('renders a chevron when onPress is supplied', () => {
    render(<GroupedRow label="Notifications" onPress={() => undefined} />);
    expect(screen.getByText('›')).toBeTruthy();
  });

  it('omits the chevron when onPress is absent', () => {
    render(<GroupedRow label="Version" value="1.2.3" />);
    expect(screen.queryByText('›')).toBeNull();
  });

  it('fires onPress on tap', () => {
    const onPress = jest.fn();
    render(<GroupedRow label="Units" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Units' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a leading icon tile when `leading` is provided', () => {
    render(
      <GroupedRow
        label="Language"
        leading={<Text testID="leading">🌐</Text>}
      />,
    );
    expect(screen.getByTestId('leading')).toBeTruthy();
  });
});
