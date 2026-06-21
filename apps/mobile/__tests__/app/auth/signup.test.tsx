import { fireEvent, render, screen } from '@testing-library/react-native';
import SignUpScreen from '../../../app/(auth)/signup';

const mockBack = jest.fn();
const mockCanGoBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    canGoBack: mockCanGoBack,
    replace: mockReplace,
  }),
}));

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
  });

  it('renders a sign-up focused screen with the same email OTP form', () => {
    render(<SignUpScreen />);

    expect(screen.getByText("Let's meet your dog.")).toBeTruthy();
    expect(screen.getByText("Create your account and you'll be walking in a minute.")).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    expect(screen.getByText('Terms')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('pops back to the sign-in screen when opened from sign-in', () => {
    render(<SignUpScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('falls back to the sign-in route when there is no navigation history', () => {
    mockCanGoBack.mockReturnValue(false);

    render(<SignUpScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
