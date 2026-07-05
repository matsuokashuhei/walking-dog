import { Alert, StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import EditDogScreen from '../../../app/(tabs)/dogs/[id]/edit';
import type { DogWithStats } from '@/types/graphql';
import { colors, dogContactChrome } from '@/theme/tokens';

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

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('expo-blur', () => {
  const { View } = jest.requireActual('react-native');
  return {
    BlurView: ({ children, ...props }: { children: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock('expo-image-picker', () => ({
  PermissionStatus: { GRANTED: 'granted' },
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/components/ui/icon-symbol', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

const mockRequestMediaLibraryPermissionsAsync =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.MockedFunction<
    typeof ImagePicker.requestMediaLibraryPermissionsAsync
  >;
const mockLaunchImageLibraryAsync =
  ImagePicker.launchImageLibraryAsync as jest.MockedFunction<
    typeof ImagePicker.launchImageLibraryAsync
  >;

const mockDogBase = {
  id: 'dog-1',
  name: 'Buddy',
  breed: 'Golden Retriever',
  gender: 'MALE',
  avatar: 'https://example.com/buddy.jpg',
  birthday: null,
  photoUrl: 'https://example.com/buddy.jpg',
  createdAt: '2026-01-01',
  walkGoal: {
    id: 'goal-1',
    dogId: 'dog-1',
    walkAmount: { minutes: 45, cycleDays: 1 },
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  walkStats: null,
} satisfies DogWithStats;

let mockDog: DogWithStats = mockDogBase;

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
    mockDog = mockDogBase;
    mockUpdateDog.mockResolvedValue(mockDog);
    mockDeleteDog.mockResolvedValue(mockDog);
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
      status: ImagePicker.PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: 'never',
    });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: true,
      assets: null,
    });
  });

  it('renders contacts-style cancel and save icon buttons', () => {
    render(<EditDogScreen />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Edit dog' })).toBeNull();
    expect(screen.queryByText('Cancel')).toBeNull();
    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.getByText('xmark')).toBeTruthy();
    expect(screen.getByText('checkmark')).toBeTruthy();

    const cancelStyle = StyleSheet.flatten(screen.getByTestId('dog-edit-cancel-button').props.style);
    const saveStyle = StyleSheet.flatten(screen.getByTestId('dog-edit-save-button').props.style);
    expect(cancelStyle.width).toBe(dogContactChrome.circleSize);
    expect(cancelStyle.backgroundColor).toBe(colors.light.background);
    expect(cancelStyle.borderColor).toBe(colors.light.border);
    expect(saveStyle.height).toBe(dogContactChrome.circleSize);
    expect(saveStyle.backgroundColor).toBe(colors.light.background);
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
          walkGoal: { minutes: 45, cycleDays: 1 },
        },
      });
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('saves the default daily goal when the dog has no current goal', async () => {
    mockDog = { ...mockDogBase, walkGoal: null };
    render(<EditDogScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateDog).toHaveBeenCalledWith({
        id: 'dog-1',
        input: expect.objectContaining({
          walkGoal: { minutes: 30, cycleDays: 1 },
        }),
      });
    });
  });

  it('saves an existing weekly goal as minutes plus cycle days', async () => {
    mockDog = {
      ...mockDogBase,
      walkGoal: {
        ...mockDogBase.walkGoal,
        walkAmount: { minutes: 210, cycleDays: 7 },
      },
    };
    render(<EditDogScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateDog).toHaveBeenCalledWith({
        id: 'dog-1',
        input: expect.objectContaining({
          walkGoal: { minutes: 210, cycleDays: 7 },
        }),
      });
    });
  });

  it('renders a remove dog button for the current dog', () => {
    render(<EditDogScreen />);

    const remove = screen.getByRole('button', { name: 'Remove Buddy' });
    const removeStyle = StyleSheet.flatten(remove.props.style);

    expect(remove).toBeTruthy();
    expect(removeStyle.borderRadius).toBe(dogContactChrome.deleteButtonRadius);
    expect(removeStyle.backgroundColor).not.toBe('transparent');
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

  it('saves the selected avatar file with the form values', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///buddy.png',
          width: 100,
          height: 100,
          fileName: 'buddy.png',
          mimeType: 'image/png',
        },
      ],
    });
    render(<EditDogScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Change photo' }));
    await waitFor(() => {
      expect(mockLaunchImageLibraryAsync).toHaveBeenCalled();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateDog).toHaveBeenCalledWith({
        id: 'dog-1',
        input: {
          name: 'Buddy',
          breed: 'Golden Retriever',
          gender: 'MALE',
          birthday: null,
          walkGoal: { minutes: 45, cycleDays: 1 },
          avatarFile: {
            uri: 'file:///buddy.png',
            name: 'buddy.png',
            type: 'image/png',
          },
        },
      });
    });
  });
});
