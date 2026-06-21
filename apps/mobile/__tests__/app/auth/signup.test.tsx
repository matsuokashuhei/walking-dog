import { fireEvent, render, screen } from '@testing-library/react-native';
import SignUpScreen from '../../../app/(auth)/signup';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a sign-up focused screen with the same email OTP form', () => {
    render(<SignUpScreen />);

    expect(screen.getByText("Let's meet your dog.")).toBeTruthy();
    expect(screen.getByText("Create your account and you'll be walking in a minute.")).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    expect(screen.getByText('Terms')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
