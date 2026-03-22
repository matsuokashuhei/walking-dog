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
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy();
    expect(screen.getByLabelText('パスワード')).toBeTruthy();
    expect(screen.getByLabelText('表示名')).toBeTruthy();
  });

  it('calls signUp with form values', async () => {
    mockSignUp.mockResolvedValue(undefined);
    render(<RegisterForm onSuccess={jest.fn()} onLoginPress={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('メールアドレス'), 'new@example.com');
    fireEvent.changeText(screen.getByLabelText('パスワード'), 'password123');
    fireEvent.changeText(screen.getByLabelText('表示名'), 'Taro');
    fireEvent.press(screen.getByRole('button', { name: 'アカウントを作成' }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'password123', 'Taro');
    });
  });
});
