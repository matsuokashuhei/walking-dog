import { Alert } from 'react-native';
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
    render(<LoginForm onSuccess={jest.fn()} />);
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('disables submit button when fields are empty', () => {
    render(<LoginForm onSuccess={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).toBeDisabled();
  });

  it('calls signIn with email and password on submit', async () => {
    mockSignIn.mockResolvedValue(undefined);
    render(<LoginForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error message on sign-in failure', async () => {
    mockSignIn.mockRejectedValue(new Error('UserNotFoundException'));
    render(<LoginForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'wrong@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'wrongpass');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeTruthy();
    });
  });

  it('renders Forgot password? link', () => {
    render(<LoginForm onSuccess={jest.fn()} />);
    expect(screen.getByText('Forgot password?')).toBeTruthy();
  });

  it('renders Continue with Apple button', () => {
    render(<LoginForm onSuccess={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeTruthy();
  });

  it('shows Coming soon Alert when Continue with Apple is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    render(<LoginForm onSuccess={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: 'Continue with Apple' }));
    expect(alertSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/coming soon/i),
    );
    alertSpy.mockRestore();
  });
});
