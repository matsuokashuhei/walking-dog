import { fireEvent, render, screen } from '@testing-library/react-native';
import SettingsScreen from '../../../app/settings';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRetry = jest.fn();
let mockViewModel: unknown;
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

jest.mock('@/hooks/use-user-screen-view-model', () => ({
  useUserScreenViewModel: () => mockViewModel,
}));

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
    mockViewModel = {
      status: 'ready',
      handleRetry: mockRetry,
      displayName: 'Mio Tanaka',
      avatarUrl: null,
      initial: 'M',
      walkingSince: 'Walking since March 2024',
      metrics: [
        { key: 'walks', value: '263', label: 'Walks' },
        { key: 'distance', value: '412.8', label: 'km' },
        { key: 'totalTime', value: '87h 0m', label: 'Total time' },
        { key: 'dogs', value: '3', label: 'Dogs' },
      ],
      week: {
        title: 'This week',
        totalLabel: '9.5 km total',
        days: [
          { key: 'mon', label: 'Mon', distanceKm: 0.8, valueLabel: '0.8', progress: 0.33, isToday: false },
          { key: 'tue', label: 'Tue', distanceKm: 1.2, valueLabel: '1.2', progress: 0.5, isToday: false },
          { key: 'wed', label: 'Wed', distanceKm: 2.1, valueLabel: '2.1', progress: 0.88, isToday: false },
          { key: 'thu', label: 'Thu', distanceKm: 0, valueLabel: '', progress: 0, isToday: false },
          { key: 'fri', label: 'Fri', distanceKm: 1.6, valueLabel: '1.6', progress: 0.67, isToday: false },
          { key: 'sat', label: 'Sat', distanceKm: 2.4, valueLabel: '2.4', progress: 1, isToday: true },
          { key: 'sun', label: 'Sun', distanceKm: 1.4, valueLabel: '1.4', progress: 0.59, isToday: false },
        ],
      },
    };
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
