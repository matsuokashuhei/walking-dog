import { fireEvent, render, screen } from '@testing-library/react-native';
import SettingsScreen from '../../../app/(tabs)/user/settings/index';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRetry = jest.fn();
let mockSettingsViewModel: unknown;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-linear-gradient', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@/components/ui/LoadingScreen', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LoadingScreen: () => <Text>Loading settings</Text> };
});

jest.mock('@/components/ui/ErrorScreen', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ErrorScreen: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
      <Text onPress={onRetry}>{message}</Text>
    ),
  };
});

jest.mock('@/hooks/use-settings-screen-view-model', () => ({
  useSettingsScreenViewModel: () => mockSettingsViewModel,
}));

jest.mock('@/components/settings/PreferencesSection', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { PreferencesSection: () => <Text>Preferences section</Text> };
});

jest.mock('@/components/settings/LegalSection', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LegalSection: () => <Text>Legal section</Text> };
});

jest.mock('@/components/settings/SignOutRow', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SignOutRow: () => <Text>Sign Out</Text> };
});

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsViewModel = {
      status: 'ready',
      handleRetry: mockRetry,
      me: { name: 'Mio Tanaka', displayName: 'Mio Tanaka', avatar: null, avatarUrl: null },
    };
  });

  it('renders the loading state while settings data is pending', () => {
    mockSettingsViewModel = { status: 'loading', handleRetry: mockRetry };

    render(<SettingsScreen />);

    expect(screen.getByText('Loading settings')).toBeTruthy();
  });

  it('renders the error state and retry handler when settings data fails to load', () => {
    mockSettingsViewModel = { status: 'error', handleRetry: mockRetry };

    render(<SettingsScreen />);
    fireEvent.press(screen.getByText('Failed to load data'));

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('renders settings sections and returns to Me', () => {
    render(<SettingsScreen />);

    expect(screen.getByRole('header', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByText('Preferences section')).toBeTruthy();
    expect(screen.getByText('Legal section')).toBeTruthy();
    expect(screen.getByText('Sign Out')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
