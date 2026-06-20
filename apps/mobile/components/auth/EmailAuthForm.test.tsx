import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { EmailAuthForm } from './EmailAuthForm';
import { emailKeyboardType } from './emailKeyboard';

const mockRequestOneTimePassword = jest.fn();
const mockVerifyOneTimePassword = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    requestOneTimePassword: mockRequestOneTimePassword,
    verifyOneTimePassword: mockVerifyOneTimePassword,
    isLoading: false,
  }),
}));

describe('EmailAuthForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders one email field before requesting a code', () => {
    render(<EmailAuthForm onSuccess={jest.fn()} />);

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toBeTruthy();
    expect(emailInput.props.keyboardType).toBe(emailKeyboardType);
    expect(emailInput.props.autoCorrect).toBe(false);
    expect(emailInput.props.spellCheck).toBe(false);
    expect(screen.queryByLabelText('Your name')).toBeNull();
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.queryByText('Create an account')).toBeNull();
    expect(screen.queryByText('Forgot password?')).toBeNull();
  });

  it('requests a one-time password and shows the code input', async () => {
    mockRequestOneTimePassword.mockResolvedValue({
      email: 'test@example.com',
      session: 'otp-session',
    });
    render(<EmailAuthForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Continue with email' }));

    await waitFor(() => {
      expect(mockRequestOneTimePassword).toHaveBeenCalledWith('test@example.com');
    });
    expect(screen.getByLabelText('One-time password')).toBeTruthy();
  });

  it('verifies a pasted eight-digit code once and calls onSuccess', async () => {
    const onSuccess = jest.fn();
    mockRequestOneTimePassword.mockResolvedValue({
      email: 'test@example.com',
      session: 'otp-session',
    });
    mockVerifyOneTimePassword.mockResolvedValue(undefined);
    render(<EmailAuthForm onSuccess={onSuccess} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Continue with email' }));
    await screen.findByLabelText('One-time password');

    fireEvent.changeText(screen.getByLabelText('One-time password'), '12345678');
    fireEvent.changeText(screen.getByLabelText('One-time password'), '12345678');

    await waitFor(() => {
      expect(mockVerifyOneTimePassword).toHaveBeenCalledTimes(1);
      expect(mockVerifyOneTimePassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        session: 'otp-session',
        code: '12345678',
      });
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows invalid code errors and allows retry', async () => {
    mockRequestOneTimePassword.mockResolvedValue({
      email: 'test@example.com',
      session: 'otp-session',
    });
    mockVerifyOneTimePassword
      .mockRejectedValueOnce({ kind: 'code-mismatch', reason: 'invalid' })
      .mockResolvedValueOnce(undefined);
    render(<EmailAuthForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Continue with email' }));
    await screen.findByLabelText('One-time password');

    fireEvent.changeText(screen.getByLabelText('One-time password'), '00000000');
    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('One-time password'), '12345678');
    await waitFor(() => {
      expect(mockVerifyOneTimePassword).toHaveBeenCalledTimes(2);
    });
  });
});
