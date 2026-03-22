import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginForm } from './LoginForm';

const mockSignIn = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isLoading: false,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders email and password inputs', () => {
    render(<LoginForm onSuccess={jest.fn()} onRegisterPress={jest.fn()} />);
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy();
    expect(screen.getByLabelText('パスワード')).toBeTruthy();
  });

  it('disables submit button when fields are empty', () => {
    render(<LoginForm onSuccess={jest.fn()} onRegisterPress={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'ログイン' });
    expect(button).toBeDisabled();
  });

  it('calls signIn with email and password on submit', async () => {
    mockSignIn.mockResolvedValue(undefined);
    render(<LoginForm onSuccess={jest.fn()} onRegisterPress={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'test@example.com');
    fireEvent.changeText(screen.getByLabelText('パスワード'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error message on sign-in failure', async () => {
    mockSignIn.mockRejectedValue(new Error('UserNotFoundException'));
    render(<LoginForm onSuccess={jest.fn()} onRegisterPress={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'wrong@example.com');
    fireEvent.changeText(screen.getByLabelText('パスワード'), 'wrongpass');
    fireEvent.press(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByText('メールアドレスまたはパスワードが正しくありません')).toBeTruthy();
    });
  });
});
