import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import EditDogScreen from '../../../app/dogs/[id]/edit';
import type { DogWithStats } from '@/types/graphql';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockUpdateDog = jest.fn();
const mockDeleteDog = jest.fn();

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'dog-1' }),
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

const mockDog = {
  id: 'dog-1',
  name: 'Buddy',
  breed: 'Golden Retriever',
  gender: 'MALE',
  birthday: null,
  photoUrl: null,
  createdAt: '2026-01-01',
  walkStats: null,
} satisfies DogWithStats;

jest.mock('@/hooks/use-dog', () => ({
  useDog: () => ({ data: mockDog, isLoading: false }),
}));

jest.mock('@/hooks/use-dog-mutations', () => ({
  useUpdateDog: () => ({ mutateAsync: mockUpdateDog }),
  useDeleteDog: () => ({ mutateAsync: mockDeleteDog }),
}));

jest.mock('@/hooks/use-mutation-with-alert', () => ({
  useMutationWithAlert: () => async <T,>(fn: () => Promise<T>) => fn(),
}));

describe('EditDogScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDog.mockResolvedValue(mockDog);
    mockDeleteDog.mockResolvedValue(mockDog);
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  it('renders the inline ScreenHeader title and common actions', () => {
    render(<EditDogScreen />);

    expect(screen.getByRole('header', { name: 'Edit dog' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('uses the ScreenHeader cancel action to go back', () => {
    render(<EditDogScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('saves the existing form values and returns to the dog detail', async () => {
    render(<EditDogScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateDog).toHaveBeenCalledWith({
        id: 'dog-1',
        input: {
          name: 'Buddy',
          breed: 'Golden Retriever',
          gender: 'MALE',
          birthday: null,
        },
      });
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders a remove dog button for the current dog', () => {
    render(<EditDogScreen />);

    expect(screen.getByRole('button', { name: 'Remove Buddy' })).toBeTruthy();
  });

  it('shows a confirmation alert before removing the dog', () => {
    render(<EditDogScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Remove Buddy' }));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Remove Buddy?',
      'This action cannot be undone.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Remove', style: 'destructive' }),
      ]),
    );
  });

  it('removes the dog and returns to the dogs tab when confirmed', async () => {
    render(<EditDogScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Remove Buddy' }));
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    buttons[1].onPress();

    await waitFor(() => {
      expect(mockDeleteDog).toHaveBeenCalledWith('dog-1');
    });
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dogs');
  });
});
