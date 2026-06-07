import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ChangePasswordScreen from '../../../app/user/change-password';

const mockBack = jest.fn();
const mockChangePassword = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/hooks/use-auth-mutations', () => ({
  useChangePassword: () => ({ mutateAsync: mockChangePassword }),
}));

describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChangePassword.mockResolvedValue(true);
  });

  it('keeps Save disabled until all password fields are valid and matching', () => {
    render(<ChangePasswordScreen />);

    const save = screen.getByRole('button', { name: 'Save' });
    expect(save.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByLabelText('Current password'), 'oldPassword1');
    fireEvent.changeText(screen.getByLabelText('New password'), 'newpass1');
    fireEvent.changeText(screen.getByLabelText('Confirm password'), 'different1');

    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(save.props.accessibilityState.disabled).toBe(true);
  });

  it('submits the password change and returns to profile', async () => {
    render(<ChangePasswordScreen />);

    fireEvent.changeText(screen.getByLabelText('Current password'), 'oldPassword1');
    fireEvent.changeText(screen.getByLabelText('New password'), 'newpass1');
    fireEvent.changeText(screen.getByLabelText('Confirm password'), 'newpass1');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        oldPassword: 'oldPassword1',
        newPassword: 'newpass1',
      });
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('maps incorrect current password errors to a specific inline error', async () => {
    mockChangePassword.mockRejectedValue({ kind: 'invalid-credentials' });
    render(<ChangePasswordScreen />);

    fireEvent.changeText(screen.getByLabelText('Current password'), 'wrongPassword1');
    fireEvent.changeText(screen.getByLabelText('New password'), 'newpass1');
    fireEvent.changeText(screen.getByLabelText('Confirm password'), 'newpass1');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Current password is incorrect')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
