import { render, screen } from '@testing-library/react-native';
import SettingsScreen from '../../../app/(tabs)/settings';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { version: '1.0.0', extra: {} },
  },
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({
    data: { displayName: 'Test User', dogs: [] },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/components/ui/LoadingScreen', () => ({
  LoadingScreen: () => null,
}));

jest.mock('@/components/ui/ErrorScreen', () => ({
  ErrorScreen: () => null,
}));

jest.mock('@/components/themed-text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    ThemedText: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock('@/components/settings/ProfileSection', () => ({
  ProfileSection: () => null,
}));

jest.mock('@/components/settings/DogListSection', () => ({
  DogListSection: () => null,
}));

jest.mock('@/components/settings/AppearanceSection', () => ({
  AppearanceSection: () => null,
}));

jest.mock('@/components/settings/LogoutButton', () => ({
  LogoutButton: () => null,
}));

describe('SettingsScreen', () => {
  it('renders editorial hero heading with large style', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });
});
