import { fireEvent, render, screen } from '@testing-library/react-native';
import UserScreen from '../../../app/(tabs)/user';

const mockPush = jest.fn();
const mockRetry = jest.fn();
let mockUserViewModel: unknown;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { version: '1.0.0', extra: {} },
  },
}));

jest.mock('@/hooks/use-user-screen-view-model', () => ({
  useUserScreenViewModel: () => mockUserViewModel,
}));

jest.mock('@/hooks/use-settings-screen-view-model', () => ({
  useSettingsScreenViewModel: () => ({
    status: 'ready',
    handleRetry: mockRetry,
    me: { name: 'Test User', displayName: 'Test User', avatar: null, avatarUrl: null },
  }),
}));

jest.mock('@/components/ui/LoadingScreen', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LoadingScreen: () => <Text>Loading Me</Text> };
});

jest.mock('@/components/ui/ErrorScreen', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ErrorScreen: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
      <Text onPress={onRetry}>{message}</Text>
    ),
  };
});

describe('UserScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserViewModel = {
      status: 'ready',
      handleRetry: mockRetry,
      displayName: 'Mio Tanaka',
      email: 'mio@walk.app',
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
  });

  it('renders the user screen as the Me tab and links to settings', () => {
    render(<UserScreen />);

    expect(screen.getByRole('header', { name: 'Me' })).toBeTruthy();
    expect(screen.getByTestId('settings-header-large-title-row')).toBeTruthy();
    expect(screen.getByTestId('settings-header-left-action-slot')).toBeTruthy();
    expect(screen.getByTestId('settings-header-right-action-slot')).toBeTruthy();
    expect(screen.getByText('Mio Tanaka')).toBeTruthy();
    expect(screen.getByText('mio@walk.app')).toBeTruthy();
    expect(screen.getByText('Walking since March 2024')).toBeTruthy();
    expect(screen.getByText('412.8')).toBeTruthy();
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText('9.5 km total')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
    expect(mockPush).toHaveBeenCalledWith('/user/edit');

    fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(mockPush).toHaveBeenCalledWith('/settings');

    fireEvent.press(screen.getByRole('button', { name: 'Change email' }));
    expect(mockPush).toHaveBeenCalledWith('/settings/email');

    expect(screen.queryByRole('button', { name: 'Change password' })).toBeNull();
  });
});
