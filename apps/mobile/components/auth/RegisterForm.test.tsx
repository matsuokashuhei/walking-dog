import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RegisterForm } from './RegisterForm';

const mockSignUp = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}));

describe('RegisterForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders required fields', () => {
    render(<RegisterForm onSuccess={jest.fn()} onLoginPress={jest.fn()} />);
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByLabelText('Display Name')).toBeTruthy();
  });

  it('calls signUp with form values', async () => {
    mockSignUp.mockResolvedValue(undefined);
    render(<RegisterForm onSuccess={jest.fn()} onLoginPress={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'new@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.changeText(screen.getByLabelText('Display Name'), 'Taro');
    fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'password123', 'Taro');
    });
  });
});
