import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { WalkEventActions } from './WalkEventActions';
import * as walkEventMutations from '@/hooks/use-walk-event-mutations';
import * as walkStore from '@/stores/walk-store';
import * as imagePicker from 'expo-image-picker';
import * as upload from '@/lib/upload';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: jest.fn(),
}));

jest.mock('@/hooks/use-walk-event-mutations', () => ({
  useRecordWalkEvent: jest.fn(),
  useGenerateWalkEventPhotoUploadUrl: jest.fn(),
}));

jest.mock('expo-image-picker');

jest.mock('@/lib/upload', () => ({
  uploadToPresignedUrl: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

const mockMutateAsync = jest.fn();
const mockPhotoMutateAsync = jest.fn();

const defaultStoreState = {
  walkId: 'walk-123',
  selectedDogIds: ['dog-1'],
  points: [
    { lat: 35.6812, lng: 139.7671, recordedAt: '2026-04-12T10:00:00Z' },
  ],
  addEvent: jest.fn(),
  removeEvent: jest.fn(),
};

function setupMocks(overrides: Partial<typeof defaultStoreState> = {}) {
  const storeState = { ...defaultStoreState, ...overrides };
  (walkStore.useWalkStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof storeState) => unknown) => selector(storeState),
  );

  (walkEventMutations.useRecordWalkEvent as jest.Mock).mockReturnValue({
    mutateAsync: mockMutateAsync,
  });

  (walkEventMutations.useGenerateWalkEventPhotoUploadUrl as jest.Mock).mockReturnValue({
    mutateAsync: mockPhotoMutateAsync,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
});

describe('WalkEventActions', () => {
  it('renders pee, poo, and photo buttons', () => {
    render(<WalkEventActions />);
    expect(screen.getByRole('button', { name: /pee/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /poo/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /photo/i })).toBeTruthy();
  });

  it('tapping pee calls recordWalkEvent with pee eventType and GPS coordinates', async () => {
    const event = {
      id: 'event-1',
      walkId: 'walk-123',
      dogId: 'dog-1',
      eventType: 'pee',
      occurredAt: expect.any(String),
      lat: 35.6812,
      lng: 139.7671,
      photoUrl: null,
    };
    mockMutateAsync.mockResolvedValue(event);

    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /pee/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          walkId: 'walk-123',
          eventType: 'pee',
          lat: 35.6812,
          lng: 139.7671,
        }),
      );
    });
  });

  it('tapping poo calls recordWalkEvent with poo eventType', async () => {
    const event = {
      id: 'event-2',
      walkId: 'walk-123',
      dogId: 'dog-1',
      eventType: 'poo',
      occurredAt: '2026-04-12T10:00:00Z',
      lat: 35.6812,
      lng: 139.7671,
      photoUrl: null,
    };
    mockMutateAsync.mockResolvedValue(event);

    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /poo/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'poo' }),
      );
    });
  });

  it('on pee success, adds event to store', async () => {
    const event = {
      id: 'event-1',
      walkId: 'walk-123',
      dogId: 'dog-1',
      eventType: 'pee',
      occurredAt: '2026-04-12T10:00:00Z',
      lat: 35.6812,
      lng: 139.7671,
      photoUrl: null,
    };
    mockMutateAsync.mockResolvedValue(event);

    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /pee/i }));

    await waitFor(() => {
      expect(defaultStoreState.addEvent).toHaveBeenCalledWith(event);
    });
  });

  it('on mutation failure, shows Alert and does not add event to store', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Network error'));

    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /pee/i }));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      expect(defaultStoreState.addEvent).not.toHaveBeenCalled();
    });
  });

  it('tapping photo launches camera and records photo event on success', async () => {
    const mockAsset = {
      uri: 'file:///photo.jpg',
      mimeType: 'image/jpeg',
    };
    (imagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [mockAsset],
    });

    mockPhotoMutateAsync.mockResolvedValue({
      url: 'https://s3.example.com/presigned',
      key: 'walks/walk-123/photo.jpg',
      expiresAt: '2026-04-12T10:15:00Z',
    });

    (upload.uploadToPresignedUrl as jest.Mock).mockResolvedValue(undefined);

    const photoEvent = {
      id: 'event-3',
      walkId: 'walk-123',
      dogId: 'dog-1',
      eventType: 'photo',
      occurredAt: '2026-04-12T10:05:00Z',
      lat: 35.6812,
      lng: 139.7671,
      photoUrl: 'https://cdn.example.com/walks/walk-123/photo.jpg',
    };
    mockMutateAsync.mockResolvedValue(photoEvent);

    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /photo/i }));

    await waitFor(() => {
      expect(imagePicker.launchCameraAsync).toHaveBeenCalledWith(
        expect.objectContaining({ quality: 0.8 }),
      );
      expect(mockPhotoMutateAsync).toHaveBeenCalledWith({
        walkId: 'walk-123',
        contentType: 'image/jpeg',
      });
      expect(upload.uploadToPresignedUrl).toHaveBeenCalledWith(
        'https://s3.example.com/presigned',
        'file:///photo.jpg',
        'image/jpeg',
      );
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'photo',
          photoKey: 'walks/walk-123/photo.jpg',
        }),
      );
      expect(defaultStoreState.addEvent).toHaveBeenCalledWith(photoEvent);
    });
  });

  it('when camera is cancelled, does nothing', async () => {
    (imagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    });

    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /photo/i }));

    await waitFor(() => {
      expect(mockPhotoMutateAsync).not.toHaveBeenCalled();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('with no GPS points, sends pee event without lat/lng', async () => {
    setupMocks({ points: [] });
    const event = {
      id: 'event-1',
      walkId: 'walk-123',
      dogId: 'dog-1',
      eventType: 'pee',
      occurredAt: '2026-04-12T10:00:00Z',
      lat: null,
      lng: null,
      photoUrl: null,
    };
    mockMutateAsync.mockResolvedValue(event);

    render(<WalkEventActions />);
    fireEvent.press(screen.getByRole('button', { name: /pee/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.not.objectContaining({ lat: expect.anything(), lng: expect.anything() }),
      );
    });
  });
});
