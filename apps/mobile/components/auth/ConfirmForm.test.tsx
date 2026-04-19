import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ConfirmForm } from './ConfirmForm';

const mockConfirmSignUp = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ confirmSignUp: mockConfirmSignUp }),
}));

function fillCode(code: string) {
  code.split('').forEach((digit, index) => {
    fireEvent.changeText(screen.getByLabelText(`Digit ${index + 1}`), digit);
  });
}

describe('ConfirmForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('disables confirm button until the code is complete', () => {
    render(<ConfirmForm email="user@example.com" onSuccess={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('calls confirmSignUp with email and code on submit', async () => {
    mockConfirmSignUp.mockResolvedValue(undefined);
    render(<ConfirmForm email="user@example.com" onSuccess={jest.fn()} />);

    fillCode('123456');
    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockConfirmSignUp).toHaveBeenCalledWith('user@example.com', '123456');
    });
  });

  it('shows invalid code error from typed auth errors', async () => {
    mockConfirmSignUp.mockRejectedValue({ kind: 'code-mismatch', reason: 'invalid' });
    render(<ConfirmForm email="user@example.com" onSuccess={jest.fn()} />);

    fillCode('123456');
    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid confirmation code')).toBeTruthy();
    });
  });

  it('shows expired code error from typed auth errors', async () => {
    mockConfirmSignUp.mockRejectedValue({ kind: 'code-mismatch', reason: 'expired' });
    render(<ConfirmForm email="user@example.com" onSuccess={jest.fn()} />);

    fillCode('123456');
    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(screen.getByText('Confirmation code has expired')).toBeTruthy();
    });
  });

  it('shows network error from typed auth errors', async () => {
    mockConfirmSignUp.mockRejectedValue({ kind: 'network' });
    render(<ConfirmForm email="user@example.com" onSuccess={jest.fn()} />);

    fillCode('123456');
    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(screen.getByText('Please check your network connection')).toBeTruthy();
    });
  });
});
