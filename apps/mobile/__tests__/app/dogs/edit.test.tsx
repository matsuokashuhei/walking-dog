import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import EditDogScreen from '../../../app/dogs/[id]/edit';
import type { DogWithStats } from '@/types/graphql';

const mockBack = jest.fn();
const mockUpdateDog = jest.fn();

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'dog-1' }),
  useRouter: () => ({ back: mockBack }),
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
}));

describe('EditDogScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDog.mockResolvedValue(mockDog);
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
});
