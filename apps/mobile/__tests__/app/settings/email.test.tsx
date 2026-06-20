import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import EmailSettingsScreen from '../../../app/settings/email';

const mockBack = jest.fn();
const mockChangeEmail = jest.fn();
const mockConfirmEmailChange = jest.fn();
const mockInvalidateUserQueries = jest.fn();
const mockRefetch = jest.fn();
let mockMe = {
  id: 'user-1',
  name: 'Mio Tanaka',
  email: 'mio@walk.app',
  avatar: null,
  avatarUrl: null,
  displayName: 'Mio Tanaka',
  createdAt: '2024-03-10T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  dogs: [],
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    changeEmail: mockChangeEmail,
    confirmEmailChange: mockConfirmEmailChange,
  }),
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({
    data: mockMe,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  }),
}));

jest.mock('@/hooks/use-invalidate-user-queries', () => ({
  useInvalidateUserQueries: () => mockInvalidateUserQueries,
}));

describe('EmailSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMe = {
      ...mockMe,
      email: 'mio@walk.app',
    };
  });

  it('shows the current login email and disables same-email submission', () => {
    render(<EmailSettingsScreen />);

    expect(screen.getByRole('header', { name: 'Change email' })).toBeTruthy();
    expect(screen.getByText('mio@walk.app')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Change password' })).toBeNull();

    fireEvent.changeText(screen.getByLabelText('New email'), 'mio@walk.app');
    expect(screen.getByRole('button', { name: 'Send code' }).props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it('sends a code, confirms it, invalidates user data, and returns', async () => {
    mockChangeEmail.mockResolvedValue({
      email: 'new-mio@walk.app',
      codeLength: 6,
    });
    mockConfirmEmailChange.mockResolvedValue({
      email: 'new-mio@walk.app',
    });
    mockInvalidateUserQueries.mockResolvedValue(undefined);

    render(<EmailSettingsScreen />);

    fireEvent.changeText(screen.getByLabelText('New email'), 'new-mio@walk.app');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() => {
      expect(mockChangeEmail).toHaveBeenCalledWith('new-mio@walk.app');
    });
    expect(screen.getByText('Enter the 6-digit code sent to new-mio@walk.app.')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('One-time password'), '123456');

    await waitFor(() => {
      expect(mockConfirmEmailChange).toHaveBeenCalledWith('123456');
      expect(mockInvalidateUserQueries).toHaveBeenCalledTimes(1);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  it('shows invalid code errors and allows retry', async () => {
    mockChangeEmail.mockResolvedValue({
      email: 'new-mio@walk.app',
      codeLength: 6,
    });
    mockConfirmEmailChange
      .mockRejectedValueOnce({ kind: 'code-mismatch', reason: 'invalid' })
      .mockResolvedValueOnce({ email: 'new-mio@walk.app' });
    mockInvalidateUserQueries.mockResolvedValue(undefined);

    render(<EmailSettingsScreen />);

    fireEvent.changeText(screen.getByLabelText('New email'), 'new-mio@walk.app');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByLabelText('One-time password');

    fireEvent.changeText(screen.getByLabelText('One-time password'), '000000');
    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('One-time password'), '123456');
    await waitFor(() => {
      expect(mockConfirmEmailChange).toHaveBeenCalledTimes(2);
    });
  });

  it('shows expired code errors', async () => {
    mockChangeEmail.mockResolvedValue({
      email: 'new-mio@walk.app',
      codeLength: 6,
    });
    mockConfirmEmailChange.mockRejectedValue({ kind: 'code-mismatch', reason: 'expired' });

    render(<EmailSettingsScreen />);

    fireEvent.changeText(screen.getByLabelText('New email'), 'new-mio@walk.app');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByLabelText('One-time password');

    fireEvent.changeText(screen.getByLabelText('One-time password'), '000000');
    await waitFor(() => {
      expect(screen.getByText('Code expired')).toBeTruthy();
    });
  });

  it('shows network errors while sending a code', async () => {
    mockChangeEmail.mockRejectedValue({ kind: 'network' });

    render(<EmailSettingsScreen />);
    fireEvent.changeText(screen.getByLabelText('New email'), 'other@walk.app');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() => {
      expect(screen.getByText('Please check your network connection')).toBeTruthy();
    });
  });
});
