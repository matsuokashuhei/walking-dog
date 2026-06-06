import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { ProfileAvatarEditor } from './ProfileAvatarEditor';

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
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockRequestMediaLibraryPermissionsAsync =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.MockedFunction<
    typeof ImagePicker.requestMediaLibraryPermissionsAsync
  >;
const mockLaunchImageLibraryAsync =
  ImagePicker.launchImageLibraryAsync as jest.MockedFunction<
    typeof ImagePicker.launchImageLibraryAsync
  >;

describe('ProfileAvatarEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('replaces the placeholder with the selected photo preview', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///selected-user.png',
          width: 100,
          height: 100,
          fileName: 'selected-user.png',
          mimeType: 'image/png',
        },
      ],
    });
    render(<ProfileAvatarEditor value={null} displayName="Mio Tanaka" onChange={jest.fn()} />);

    fireEvent.press(screen.getByRole('button', { name: 'Change photo' }));

    await waitFor(() => {
      const image = screen.getByTestId('profile-avatar-editor-avatar-image');
      expect(image.props.source).toEqual({ uri: 'file:///selected-user.png' });
      expect(image.props.recyclingKey).toBe('file:///selected-user.png');
    });
    expect(screen.queryByText('M')).toBeNull();
  });
});
