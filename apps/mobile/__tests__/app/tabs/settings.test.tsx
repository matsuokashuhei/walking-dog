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

jest.mock('@/components/settings/ProfileCard', () => ({
  ProfileCard: () => null,
}));

jest.mock('@/components/settings/PreferencesSection', () => ({
  PreferencesSection: () => null,
}));

jest.mock('@/components/settings/LegalSection', () => ({
  LegalSection: () => null,
}));

jest.mock('@/components/settings/SignOutRow', () => ({
  SignOutRow: () => null,
}));

describe('SettingsScreen', () => {
  it('renders the Me large-title heading', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Me')).toBeTruthy();
  });
});
