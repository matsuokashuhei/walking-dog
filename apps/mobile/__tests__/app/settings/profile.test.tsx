import { fireEvent, render, screen } from '@testing-library/react-native';
import ProfileScreen from '../../../app/settings/profile';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRetry = jest.fn();
let mockViewModel: unknown;

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
  return { LoadingScreen: () => <Text>Loading user profile</Text> };
});

jest.mock('@/components/ui/ErrorScreen', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ErrorScreen: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
      <Text onPress={onRetry}>{message}</Text>
    ),
  };
});

jest.mock('@/hooks/use-user-profile-view-model', () => ({
  useUserProfileViewModel: () => mockViewModel,
}));

describe('ProfileScreen', () => {
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
  });

  it('renders the loading state while the profile query is pending', () => {
    mockViewModel = { status: 'loading', handleRetry: mockRetry };

    render(<ProfileScreen />);

    expect(screen.getByText('Loading user profile')).toBeTruthy();
  });

  it('renders the error state and retry handler when profile data fails to load', () => {
    mockViewModel = { status: 'error', handleRetry: mockRetry };

    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('Failed to load profile'));

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('renders user profile data and opens edit profile', () => {
    render(<ProfileScreen />);

    expect(screen.getByRole('header', { name: 'Profile' })).toBeTruthy();
    expect(screen.getByText('Mio Tanaka')).toBeTruthy();
    expect(screen.getByText('Walking since March 2024')).toBeTruthy();
    expect(screen.getByText('412.8')).toBeTruthy();
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText('9.5 km total')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Edit' }));

    expect(mockPush).toHaveBeenCalledWith('/settings/profile/edit');
  });
});
