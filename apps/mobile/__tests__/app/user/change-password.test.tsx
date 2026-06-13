import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ChangePasswordScreen from '../../../app/user/change-password';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockChangePassword = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    changePassword: mockChangePassword,
  }),
}));

describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps submit disabled until all password fields are valid', () => {
    render(<ChangePasswordScreen />);

    expect(screen.getByRole('button', { name: 'Update password' })).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('Current password'), 'Currentpass1');
    fireEvent.changeText(screen.getByLabelText('New password'), 'Newpass1');
    fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Newpass1');

    expect(screen.getByRole('button', { name: 'Update password' })).not.toBeDisabled();
  });

  it('shows a mismatch error without calling the API', async () => {
    render(<ChangePasswordScreen />);

    fireEvent.changeText(screen.getByLabelText('Current password'), 'Currentpass1');
    fireEvent.changeText(screen.getByLabelText('New password'), 'Newpass1');
    fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Different1');
    fireEvent.press(screen.getByRole('button', { name: 'Update password' }));

    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('changes the password and returns to sign-in', async () => {
    mockChangePassword.mockResolvedValue(undefined);
    render(<ChangePasswordScreen />);

    fireEvent.changeText(screen.getByLabelText('Current password'), 'Currentpass1');
    fireEvent.changeText(screen.getByLabelText('New password'), 'Newpass1');
    fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Newpass1');
    fireEvent.press(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('Currentpass1', 'Newpass1');
    });
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('maps current password errors to an actionable message', async () => {
    mockChangePassword.mockRejectedValue({ kind: 'invalid-credentials' });
    render(<ChangePasswordScreen />);

    fireEvent.changeText(screen.getByLabelText('Current password'), 'Wrongpass1');
    fireEvent.changeText(screen.getByLabelText('New password'), 'Newpass1');
    fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Newpass1');
    fireEvent.press(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeTruthy();
    });
  });
});
