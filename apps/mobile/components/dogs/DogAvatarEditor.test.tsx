import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { DogAvatarEditor } from './DogAvatarEditor';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

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

describe('DogAvatarEditor', () => {
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

  it('passes an existing avatar URL to the image source', () => {
    render(
      <DogAvatarEditor
        value="https://example.com/buddy.jpg"
        onChange={jest.fn()}
        dogName="Buddy"
      />,
    );

    expect(screen.getByTestId('dog-avatar-editor-image').props.source).toEqual({
      uri: 'https://example.com/buddy.jpg',
    });
  });

  it('renders the dog fallback when no avatar URL is present', () => {
    render(<DogAvatarEditor value={null} onChange={jest.fn()} dogName="Buddy" />);

    expect(screen.getByText('🐩')).toBeTruthy();
  });

  it('launches the image library when Change photo is pressed', async () => {
    render(<DogAvatarEditor value={null} onChange={jest.fn()} dogName="Buddy" />);

    fireEvent.press(screen.getByRole('button', { name: 'Change photo' }));

    await waitFor(() => {
      expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaTypes: 'images',
          allowsEditing: true,
        }),
      );
    });
  });

  it('emits an UploadFile from the selected image asset', async () => {
    const onChange = jest.fn();
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///selected.png',
          width: 100,
          height: 100,
          fileName: 'selected.png',
          mimeType: 'image/x-png',
        },
      ],
    });
    render(<DogAvatarEditor value={null} onChange={onChange} dogName="Buddy" />);

    fireEvent.press(screen.getByRole('button', { name: 'Change photo' }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        uri: 'file:///selected.png',
        name: 'selected.png',
        type: 'image/png',
      });
    });
  });

  it('does not emit a file when image picking is canceled', async () => {
    const onChange = jest.fn();
    render(<DogAvatarEditor value={null} onChange={onChange} dogName="Buddy" />);

    fireEvent.press(screen.getByRole('button', { name: 'Change photo' }));

    await waitFor(() => {
      expect(mockLaunchImageLibraryAsync).toHaveBeenCalled();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a localized alert when photo permission is denied', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
      status: ImagePicker.PermissionStatus.DENIED,
      canAskAgain: false,
      expires: 'never',
    });
    render(<DogAvatarEditor value={null} onChange={jest.fn()} dogName="Buddy" />);

    fireEvent.press(screen.getByRole('button', { name: 'Change photo' }));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Photo access denied',
        'Please allow photo library access in Settings.',
      );
    });
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
  });
});
