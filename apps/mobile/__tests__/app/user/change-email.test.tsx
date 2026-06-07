import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ChangeEmailScreen from '../../../app/user/change-email';

const mockBack = jest.fn();
const mockChangeEmail = jest.fn();
const mockConfirmEmailChange = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/hooks/use-auth-mutations', () => ({
  useChangeEmail: () => ({ mutateAsync: mockChangeEmail }),
  useConfirmEmailChange: () => ({ mutateAsync: mockConfirmEmailChange }),
}));

describe('ChangeEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChangeEmail.mockResolvedValue(true);
    mockConfirmEmailChange.mockResolvedValue(true);
  });

  it('requests an email change, then confirms the verification code', async () => {
    render(<ChangeEmailScreen />);

    fireEvent.changeText(screen.getByLabelText('New email'), 'mio.new@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() => {
      expect(mockChangeEmail).toHaveBeenCalledWith({ newEmail: 'mio.new@example.com' });
    });

    expect(screen.getByText('Code sent to mio.new@example.com')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
    fireEvent.press(screen.getByRole('button', { name: 'Confirm email' }));

    await waitFor(() => {
      expect(mockConfirmEmailChange).toHaveBeenCalledWith({ code: '123456' });
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('maps expired confirmation codes to a specific inline error', async () => {
    mockChangeEmail.mockResolvedValue(true);
    mockConfirmEmailChange.mockRejectedValue({
      kind: 'code-mismatch',
      reason: 'expired',
    });
    render(<ChangeEmailScreen />);

    fireEvent.changeText(screen.getByLabelText('New email'), 'mio.new@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));

    await screen.findByLabelText('Verification code');
    fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
    fireEvent.press(screen.getByRole('button', { name: 'Confirm email' }));

    expect(await screen.findByText('Verification code has expired')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
