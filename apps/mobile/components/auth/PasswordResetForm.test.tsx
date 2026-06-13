import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PasswordResetForm } from './PasswordResetForm';

const mockForgotPassword = jest.fn();
const mockConfirmForgotPassword = jest.fn();
const mockOnComplete = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    forgotPassword: mockForgotPassword,
    confirmForgotPassword: mockConfirmForgotPassword,
  }),
}));

function fillCode(code: string) {
  code.split('').forEach((digit, index) => {
    fireEvent.changeText(screen.getByLabelText(`Digit ${index + 1}`), digit);
  });
}

describe('PasswordResetForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests a reset code before showing password fields', async () => {
    mockForgotPassword.mockResolvedValue(true);
    render(<PasswordResetForm onComplete={mockOnComplete} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset code' }));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
    });
    expect(screen.getByText('Check your email')).toBeTruthy();
    expect(screen.getByLabelText('New password')).toBeTruthy();
  });

  it('resets the password with code and matching new passwords', async () => {
    mockForgotPassword.mockResolvedValue(true);
    mockConfirmForgotPassword.mockResolvedValue(true);
    render(<PasswordResetForm onComplete={mockOnComplete} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset code' }));
    await screen.findByText('Check your email');

    fillCode('123456');
    fireEvent.changeText(screen.getByLabelText('New password'), 'Newpass1');
    fireEvent.changeText(screen.getByLabelText('Confirm'), 'Newpass1');
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => {
      expect(mockConfirmForgotPassword).toHaveBeenCalledWith(
        'user@example.com',
        '123456',
        'Newpass1',
      );
    });
    expect(screen.getByText('Password reset')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back to Sign in' }));
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('shows a password mismatch message without calling the reset API', async () => {
    mockForgotPassword.mockResolvedValue(true);
    render(<PasswordResetForm onComplete={mockOnComplete} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset code' }));
    await screen.findByText('Check your email');

    fillCode('123456');
    fireEvent.changeText(screen.getByLabelText('New password'), 'Newpass1');
    fireEvent.changeText(screen.getByLabelText('Confirm'), 'Different1');
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));

    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(mockConfirmForgotPassword).not.toHaveBeenCalled();
  });

  it('shows reset code errors from auth failures', async () => {
    mockForgotPassword.mockResolvedValue(true);
    mockConfirmForgotPassword.mockRejectedValue({
      kind: 'code-mismatch',
      reason: 'invalid',
    });
    render(<PasswordResetForm onComplete={mockOnComplete} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset code' }));
    await screen.findByText('Check your email');

    fillCode('123456');
    fireEvent.changeText(screen.getByLabelText('New password'), 'Newpass1');
    fireEvent.changeText(screen.getByLabelText('Confirm'), 'Newpass1');
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid reset code')).toBeTruthy();
    });
  });
});
