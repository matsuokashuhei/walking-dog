import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RegisterForm } from './RegisterForm';

const mockSignUp = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}));

describe('RegisterForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders required fields with Precise labels', () => {
    render(<RegisterForm onSuccess={jest.fn()} />);
    expect(screen.getByLabelText('Your name')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('renders the dog-profile helper text', () => {
    render(<RegisterForm onSuccess={jest.fn()} />);
    expect(screen.getByText(/dog's profile on the next step/i)).toBeTruthy();
  });

  it('disables Continue when fields are empty or password too short', () => {
    render(<RegisterForm onSuccess={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toBeDisabled();
  });

  it('calls signUp with form values on Continue', async () => {
    mockSignUp.mockResolvedValue({ userConfirmed: false });
    render(<RegisterForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Your name'), 'Taro');
    fireEvent.changeText(screen.getByLabelText('Email'), 'new@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'password123', 'Taro');
    });
  });

  it('shows user exists error from typed auth errors', async () => {
    mockSignUp.mockRejectedValue({ kind: 'user-exists' });
    render(<RegisterForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Your name'), 'Taro');
    fireEvent.changeText(screen.getByLabelText('Email'), 'new@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByText('This email is already registered')).toBeTruthy();
    });
  });

  it('shows invalid password error from typed auth errors', async () => {
    mockSignUp.mockRejectedValue({ kind: 'invalid-password' });
    render(<RegisterForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Your name'), 'Taro');
    fireEvent.changeText(screen.getByLabelText('Email'), 'new@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByText('Password does not meet requirements')).toBeTruthy();
    });
  });

  it('shows network error from typed auth errors', async () => {
    mockSignUp.mockRejectedValue({ kind: 'network' });
    render(<RegisterForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Your name'), 'Taro');
    fireEvent.changeText(screen.getByLabelText('Email'), 'new@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByText('Please check your network connection')).toBeTruthy();
    });
  });

  it('renders Terms and Privacy Policy links', () => {
    render(<RegisterForm onSuccess={jest.fn()} />);
    expect(screen.getByText('Terms')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('shows a Coming soon Alert when Terms is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    render(<RegisterForm onSuccess={jest.fn()} />);
    fireEvent.press(screen.getByText('Terms'));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('shows a Coming soon Alert when Privacy Policy is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    render(<RegisterForm onSuccess={jest.fn()} />);
    fireEvent.press(screen.getByText('Privacy Policy'));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
