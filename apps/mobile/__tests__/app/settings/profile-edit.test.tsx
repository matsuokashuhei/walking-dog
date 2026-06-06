import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import ProfileEditScreen from '../../../app/settings/profile/edit';

const mockBack = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-linear-gradient', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('expo-image-picker', () => ({
  PermissionStatus: { GRANTED: 'granted' },
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({
    data: {
      id: 'user-1',
      name: 'Mio Tanaka',
      displayName: 'Mio Tanaka',
      avatar: null,
      avatarUrl: null,
      createdAt: '2024-03-10T00:00:00Z',
      dogs: [],
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-user-mutations', () => ({
  useUpdateUser: () => ({ mutateAsync: mockUpdateUser }),
}));

jest.mock('@/hooks/use-mutation-with-alert', () => ({
  useMutationWithAlert: () => async <T,>(fn: () => Promise<T>) => fn(),
}));

const mockRequestMediaLibraryPermissionsAsync =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.MockedFunction<
    typeof ImagePicker.requestMediaLibraryPermissionsAsync
  >;
const mockLaunchImageLibraryAsync =
  ImagePicker.launchImageLibraryAsync as jest.MockedFunction<
    typeof ImagePicker.launchImageLibraryAsync
  >;

describe('ProfileEditScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUser.mockResolvedValue({
      id: 'user-1',
      name: 'Mio Updated',
      displayName: 'Mio Updated',
      avatar: null,
      avatarUrl: null,
      createdAt: '2024-03-10T00:00:00Z',
      dogs: [],
    });
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

  it('saves the edited user name and returns to the profile screen', async () => {
    render(<ProfileEditScreen />);

    fireEvent.changeText(screen.getByLabelText('Name'), 'Mio Updated');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        input: {
          name: 'Mio Updated',
        },
      });
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('saves the selected avatar file with the edited user name', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///mio.png',
          width: 100,
          height: 100,
          fileName: 'mio.png',
          mimeType: 'image/png',
        },
      ],
    });
    render(<ProfileEditScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Change photo' }));
    await waitFor(() => {
      expect(mockLaunchImageLibraryAsync).toHaveBeenCalled();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        input: {
          name: 'Mio Tanaka',
          avatarFile: {
            uri: 'file:///mio.png',
            name: 'mio.png',
            type: 'image/png',
          },
        },
      });
    });
  });
});
