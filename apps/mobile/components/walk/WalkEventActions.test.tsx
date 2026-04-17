import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { WalkEventActions } from './WalkEventActions';
import * as walkEventMutations from '@/hooks/use-walk-event-mutations';
import * as walkStore from '@/stores/walk-store';
import * as imagePicker from 'expo-image-picker';
import * as photoUpload from '@/hooks/use-photo-upload';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light' },
}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('@/stores/walk-store', () => ({ useWalkStore: jest.fn() }));
jest.mock('@/hooks/use-walk-event-mutations', () => ({
  useRecordWalkEvent: jest.fn(),
  useGenerateWalkEventPhotoUploadUrl: jest.fn(),
}));
jest.mock('@/hooks/use-photo-upload', () => {
  const actual = jest.requireActual('@/hooks/use-photo-upload');
  return { ...actual, usePhotoUpload: jest.fn() };
});
jest.mock('expo-image-picker');
jest.spyOn(Alert, 'alert');

const mockMutateAsync = jest.fn();
const mockUploadPhoto = jest.fn();

const defaultStoreState = {
  walkId: 'walk-123' as string | null,
  selectedDogIds: ['dog-1'],
  points: [{ lat: 35.68, lng: 139.76, recordedAt: '2026-04-12T10:00:00Z' }],
  addEvent: jest.fn(),
  removeEvent: jest.fn(),
};

function setupMocks(
  storeOverrides: Partial<typeof defaultStoreState> = {},
  opts: { recordIsPending?: boolean; uploadIsPending?: boolean } = {},
) {
  const state = { ...defaultStoreState, ...storeOverrides };
  (walkStore.useWalkStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof state) => unknown) => selector(state),
  );
  (walkEventMutations.useRecordWalkEvent as jest.Mock).mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: opts.recordIsPending ?? false,
  });
  (photoUpload.usePhotoUpload as jest.Mock).mockReturnValue({
    uploadPhoto: mockUploadPhoto,
    isPending: opts.uploadIsPending ?? false,
  });
}

let consoleErrorSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
  (imagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('WalkEventActions', () => {
  it('renders pee, poo, and photo buttons', () => {
    render(<WalkEventActions />);
    expect(screen.getByRole('button', { name: /pee/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /poo/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /photo/i })).toBeTruthy();
  });

  it('tapping pee records event with GPS, adds to store, and triggers haptic', async () => {
    const event = { id: 'event-1', eventType: 'pee' };
    mockMutateAsync.mockResolvedValue(event);

    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /pee/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ walkId: 'walk-123', eventType: 'pee', lat: 35.68, lng: 139.76 }),
      );
      expect(defaultStoreState.addEvent).toHaveBeenCalledWith(event);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  it('tapping poo records event with poo eventType', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'event-2', eventType: 'poo' });
    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /poo/i }));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'poo' }));
    });
  });

  it('on mutation failure, shows Alert, logs, and does not add event', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Network error'));
    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /pee/i }));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      expect(defaultStoreState.addEvent).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('walk event record failed', expect.any(Error));
    });
  });

  it('with no GPS points, pee event omits lat/lng', async () => {
    setupMocks({ points: [] });
    mockMutateAsync.mockResolvedValue({ id: 'event-1' });
    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /pee/i }));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.not.objectContaining({ lat: expect.anything(), lng: expect.anything() }),
      );
    });
  });

  it('tapping photo launches camera, runs uploadPhoto, and adds event', async () => {
    const asset = { uri: 'file:///photo.jpg', mimeType: 'image/jpeg' };
    (imagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [asset],
    });
    const photoEvent = { id: 'event-3', eventType: 'photo' };
    mockUploadPhoto.mockResolvedValue(photoEvent);

    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /photo/i }));

    await waitFor(() => {
      expect(mockUploadPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          walkId: 'walk-123',
          dogId: 'dog-1',
          asset,
          latestPoint: { lat: 35.68, lng: 139.76 },
        }),
      );
      expect(defaultStoreState.addEvent).toHaveBeenCalledWith(photoEvent);
    });
  });

  it('when camera is cancelled, does not run uploadPhoto', async () => {
    (imagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /photo/i }));
    await waitFor(() => expect(mockUploadPhoto).not.toHaveBeenCalled());
  });

  it('when camera permission is denied, shows Alert and does not launch camera', async () => {
    (imagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /photo/i }));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.any(String),
        'Camera access is required. Please enable it in Settings.',
      );
    });
    expect(imagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('photo presign failure shows presign-specific error message', async () => {
    (imagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///p.jpg', mimeType: 'image/jpeg' }],
    });
    mockUploadPhoto.mockRejectedValue(
      new photoUpload.PhotoUploadError('presign', new Error('boom')),
    );
    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /photo/i }));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.any(String),
        'Failed to prepare photo upload. Please try again.',
      );
    });
  });

  it.each([
    ['walkId null', { walkId: null }, {}],
    ['record pending', {}, { recordIsPending: true }],
    ['upload pending', {}, { uploadIsPending: true }],
  ] as const)('buttons disabled when %s', (_label, storeOverrides, opts) => {
    setupMocks(storeOverrides, opts);
    render(<WalkEventActions />);
    expect(screen.getByRole('button', { name: /pee/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /photo/i })).toBeDisabled();
  });
});
