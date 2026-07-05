import { ActionSheetIOS } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import NewDogScreen from '../../../app/dogs/new';

const mockBack = jest.fn();
const mockDismiss = jest.fn();
const mockPush = jest.fn();
const mockCreateDog = jest.fn();

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
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

jest.mock('@expo/ui/swift-ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual('react-native');
  return {
    Host: ({ children, ...props }: { children: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
    Slider: ({ onValueChange, ...props }: { onValueChange?: (value: number) => void }) => (
      <View {...props} accessibilityRole="adjustable" onValueChange={onValueChange} />
    ),
  };
});

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  clipped: (clipped = true) => ({ $type: 'clipped', clipped }),
  frame: (params: Record<string, unknown>) => ({ $type: 'frame', ...params }),
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

const mockRequestMediaLibraryPermissionsAsync =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.MockedFunction<
    typeof ImagePicker.requestMediaLibraryPermissionsAsync
  >;
const mockLaunchImageLibraryAsync =
  ImagePicker.launchImageLibraryAsync as jest.MockedFunction<
    typeof ImagePicker.launchImageLibraryAsync
  >;

describe('NewDogScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(
      (_config, cb) => cb(1),
    );
    mockCreateDog.mockResolvedValue({ id: 'dog-1' });
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

  it('renders the edit-style chrome, photo editor, form, and goal without a remove action', () => {
    render(<NewDogScreen />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Register dog' })).toBeNull();
    expect(screen.queryByText('Cancel')).toBeNull();
    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.getByText('xmark')).toBeTruthy();
    expect(screen.getByText('checkmark')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeTruthy();
    expect(screen.getByText('🐩')).toBeTruthy();
    expect(screen.getByText('GOAL')).toBeTruthy();
    expect(screen.getByText('Cycle')).toBeTruthy();
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.queryByText(/Remove /)).toBeNull();
  });

  it('uses the chrome cancel action to go back', () => {
    render(<NewDogScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('keeps Save disabled until the dog form is valid', () => {
    render(<NewDogScreen />);

    const save = screen.getByRole('button', { name: 'Save' });

    expect(save.props.accessibilityState?.disabled).toBe(true);
  });

  it('saves profile, avatar, and goal values from the unified registration screen', async () => {
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
    render(<NewDogScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Change photo' }));
    await waitFor(() => {
      expect(mockLaunchImageLibraryAsync).toHaveBeenCalled();
    });
    fireEvent.changeText(screen.getByLabelText('Name'), 'Buddy');
    fireEvent.changeText(screen.getByLabelText('Breed'), 'Golden Retriever');
    fireEvent.press(screen.getByRole('button', { name: 'Gender' }));
    fireEvent.press(screen.getByRole('button', { name: 'WEEKLY' }));
    fireEvent(screen.getByTestId('dog-goal-slider'), 'valueChange', 60);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateDog).toHaveBeenCalledWith({
        name: 'Buddy',
        breed: 'Golden Retriever',
        gender: 'FEMALE',
        birthday: null,
        walkGoal: { minutes: 60, cycleDays: 7 },
        avatarFile: {
          uri: 'file:///buddy.png',
          name: 'buddy.png',
          type: 'image/png',
        },
      });
    });
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/dogs/dog-1');
  });
});
