import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { EmailAuthForm } from './EmailAuthForm';

const mockRequestOneTimePassword = jest.fn();
const mockVerifyOneTimePassword = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    requestOneTimePassword: mockRequestOneTimePassword,
    verifyOneTimePassword: mockVerifyOneTimePassword,
  }),
}));

describe('EmailAuthForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with email only and no password recovery UI', () => {
    render(<EmailAuthForm onSuccess={jest.fn()} />);

    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with email' })).toBeDisabled();
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.queryByText('Forgot password?')).toBeNull();
  });

  it('requests a one-time password and shows the code step', async () => {
    mockRequestOneTimePassword.mockResolvedValue({ challengeId: 'challenge-id' });
    render(<EmailAuthForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'owner@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Continue with email' }));

    await waitFor(() => {
      expect(mockRequestOneTimePassword).toHaveBeenCalledWith('owner@example.com');
    });
    expect(screen.getByText('Check your email')).toBeTruthy();
    expect(screen.getByLabelText('One-time password')).toBeTruthy();
  });

  it('requests a one-time password from the email return key', async () => {
    mockRequestOneTimePassword.mockResolvedValue({ challengeId: 'challenge-id' });
    render(<EmailAuthForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'owner@example.com');
    fireEvent(screen.getByLabelText('Email'), 'submitEditing');

    await waitFor(() => {
      expect(mockRequestOneTimePassword).toHaveBeenCalledWith('owner@example.com');
    });
    expect(screen.getByText('Check your email')).toBeTruthy();
  });

  it('verifies automatically when a six digit one-time password is pasted', async () => {
    const onSuccess = jest.fn();
    mockRequestOneTimePassword.mockResolvedValue({ challengeId: 'challenge-id' });
    mockVerifyOneTimePassword.mockResolvedValue(undefined);
    render(<EmailAuthForm onSuccess={onSuccess} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'owner@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Continue with email' }));
    await screen.findByLabelText('One-time password');

    fireEvent.changeText(screen.getByLabelText('One-time password'), '123456');

    await waitFor(() => {
      expect(mockVerifyOneTimePassword).toHaveBeenCalledWith('challenge-id', '123456');
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not verify the same completed code twice', async () => {
    mockRequestOneTimePassword.mockResolvedValue({ challengeId: 'challenge-id' });
    mockVerifyOneTimePassword.mockResolvedValue(undefined);
    render(<EmailAuthForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'owner@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Continue with email' }));
    await screen.findByLabelText('One-time password');

    fireEvent.changeText(screen.getByLabelText('One-time password'), '123456');
    fireEvent.changeText(screen.getByLabelText('One-time password'), '123456');

    await waitFor(() => {
      expect(mockVerifyOneTimePassword).toHaveBeenCalledTimes(1);
    });
  });

  it('shows invalid code errors and keeps the code editable', async () => {
    mockRequestOneTimePassword.mockResolvedValue({ challengeId: 'challenge-id' });
    mockVerifyOneTimePassword.mockRejectedValue({
      kind: 'code-mismatch',
      reason: 'invalid',
    });
    render(<EmailAuthForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'owner@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Continue with email' }));
    await screen.findByLabelText('One-time password');
    fireEvent.changeText(screen.getByLabelText('One-time password'), '000000');

    await waitFor(() => {
      expect(screen.getByText('Invalid one-time password')).toBeTruthy();
    });
    expect(screen.getByLabelText('One-time password')).toBeTruthy();
  });
});
