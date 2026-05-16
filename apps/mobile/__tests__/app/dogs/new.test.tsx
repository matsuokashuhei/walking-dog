import { fireEvent, render, screen } from '@testing-library/react-native';
import NewDogScreen from '../../../app/dogs/new';

const mockBack = jest.fn();
const mockDismiss = jest.fn();
const mockPush = jest.fn();
const mockCreateDog = jest.fn();

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    dismiss: mockDismiss,
    push: mockPush,
  }),
}));

jest.mock('@/hooks/use-dog-mutations', () => ({
  useCreateDog: () => ({ mutateAsync: mockCreateDog }),
}));

describe('NewDogScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the inline ScreenHeader title and common actions', () => {
    render(<NewDogScreen />);

    expect(screen.getByRole('header', { name: 'Register dog' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('uses the ScreenHeader cancel action to go back', () => {
    render(<NewDogScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('keeps Save disabled until the dog form is valid', () => {
    render(<NewDogScreen />);

    const save = screen.getByRole('button', { name: 'Save' });

    expect(save.props.accessibilityState?.disabled).toBe(true);
  });
});
