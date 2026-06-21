import { fireEvent, render, screen } from '@testing-library/react-native';
import LoginScreen from '../../../app/(auth)/login';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Path: 'Path',
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a sign-in focused screen and links to sign-up', () => {
    render(<LoginScreen />);

    expect(screen.getByRole('image', { name: /walking dog/i })).toBeTruthy();
    expect(screen.getByText('Welcome back')).toBeTruthy();
    expect(screen.getByText('Sign in to keep walking with your dog.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Create an account' }));

    expect(mockPush).toHaveBeenCalledWith('/(auth)/signup');
  });
});
