import { ActionSheetIOS } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NewDogScreen from '../../../app/(tabs)/dogs/new';

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
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => callback(0));
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

  it('creates a dog and opens its detail inside the Dogs tab stack', async () => {
    mockCreateDog.mockResolvedValue({ id: 'dog-7' });
    render(<NewDogScreen />);

    fireEvent.changeText(screen.getByLabelText('Name'), 'Momo');
    fireEvent.press(screen.getByRole('button', { name: 'Gender' }));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Save' }).props.accessibilityState?.disabled,
      ).toBe(false);
    });
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateDog).toHaveBeenCalledWith({
        name: 'Momo',
        breed: undefined,
        gender: 'MALE',
        birthday: null,
      });
    });
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/dogs/dog-7');
  });
});
