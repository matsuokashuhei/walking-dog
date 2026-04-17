import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SettingsSection } from './SettingsSection';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('SettingsSection', () => {
  it('renders title in uppercase and children', () => {
    render(
      <SettingsSection title="Profile">
        <Text>body content</Text>
      </SettingsSection>,
    );
    expect(screen.getByText('PROFILE')).toBeTruthy();
    expect(screen.getByText('body content')).toBeTruthy();
  });
});
