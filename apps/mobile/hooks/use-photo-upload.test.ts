import { renderHook, act } from '@testing-library/react-native';
import { usePhotoUpload, PhotoUploadError } from './use-photo-upload';
import * as walkEventMutations from './use-walk-event-mutations';
import * as upload from '@/lib/upload';

jest.mock('./use-walk-event-mutations', () => ({
  useRecordWalkEvent: jest.fn(),
  useGenerateWalkEventPhotoUploadUrl: jest.fn(),
}));

jest.mock('@/lib/upload', () => ({
  uploadToPresignedUrl: jest.fn(),
}));

const mockRecordMutateAsync = jest.fn();
const mockPresignMutateAsync = jest.fn();

function setupMocks(options: { recordIsPending?: boolean; presignIsPending?: boolean } = {}) {
  (walkEventMutations.useRecordWalkEvent as jest.Mock).mockReturnValue({
    mutateAsync: mockRecordMutateAsync,
    isPending: options.recordIsPending ?? false,
  });
  (walkEventMutations.useGenerateWalkEventPhotoUploadUrl as jest.Mock).mockReturnValue({
    mutateAsync: mockPresignMutateAsync,
    isPending: options.presignIsPending ?? false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
});

describe('usePhotoUpload', () => {
  it('runs presign → upload → record and returns the recorded event', async () => {
    mockPresignMutateAsync.mockResolvedValue({
      url: 'https://s3.example.com/presigned',
      key: 'walks/walk-1/photo.jpg',
      expiresAt: '2026-04-12T10:15:00Z',
    });
    (upload.uploadToPresignedUrl as jest.Mock).mockResolvedValue(undefined);
    const event = {
      id: 'event-1',
      walkId: 'walk-1',
      dogId: 'dog-1',
      eventType: 'photo',
      occurredAt: '2026-04-12T10:05:00Z',
      lat: 35.68,
      lng: 139.76,
      photoUrl: 'https://cdn.example.com/walks/walk-1/photo.jpg',
    };
    mockRecordMutateAsync.mockResolvedValue(event);

    const { result } = renderHook(() => usePhotoUpload());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.uploadPhoto({
        walkId: 'walk-1',
        dogId: 'dog-1',
        asset: { uri: 'file:///photo.jpg', mimeType: 'image/jpeg' },
        latestPoint: { lat: 35.68, lng: 139.76 },
      });
    });

    expect(mockPresignMutateAsync).toHaveBeenCalledWith({
      walkId: 'walk-1',
      contentType: 'image/jpeg',
    });
    expect(upload.uploadToPresignedUrl).toHaveBeenCalledWith(
      'https://s3.example.com/presigned',
      'file:///photo.jpg',
      'image/jpeg',
    );
    expect(mockRecordMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        walkId: 'walk-1',
        dogId: 'dog-1',
        eventType: 'photo',
        photoKey: 'walks/walk-1/photo.jpg',
        lat: 35.68,
        lng: 139.76,
      }),
    );
    expect(returned).toEqual(event);
  });

  it('defaults mimeType to image/jpeg when null', async () => {
    mockPresignMutateAsync.mockResolvedValue({ url: 'u', key: 'k', expiresAt: 'e' });
    (upload.uploadToPresignedUrl as jest.Mock).mockResolvedValue(undefined);
    mockRecordMutateAsync.mockResolvedValue({ id: 'e' });

    const { result } = renderHook(() => usePhotoUpload());

    await act(async () => {
      await result.current.uploadPhoto({
        walkId: 'walk-1',
        asset: { uri: 'file:///photo.jpg', mimeType: null },
      });
    });

    expect(mockPresignMutateAsync).toHaveBeenCalledWith({
      walkId: 'walk-1',
      contentType: 'image/jpeg',
    });
  });

  it('omits lat/lng when latestPoint is not given', async () => {
    mockPresignMutateAsync.mockResolvedValue({ url: 'u', key: 'k', expiresAt: 'e' });
    (upload.uploadToPresignedUrl as jest.Mock).mockResolvedValue(undefined);
    mockRecordMutateAsync.mockResolvedValue({ id: 'e' });

    const { result } = renderHook(() => usePhotoUpload());

    await act(async () => {
      await result.current.uploadPhoto({
        walkId: 'walk-1',
        asset: { uri: 'file:///p.jpg', mimeType: 'image/jpeg' },
      });
    });

    expect(mockRecordMutateAsync).toHaveBeenCalledWith(
      expect.not.objectContaining({ lat: expect.anything(), lng: expect.anything() }),
    );
  });

  it('throws PhotoUploadError with phase="presign" when presign fails', async () => {
    const cause = new Error('Presign failed');
    mockPresignMutateAsync.mockRejectedValue(cause);

    const { result } = renderHook(() => usePhotoUpload());

    await expect(
      result.current.uploadPhoto({
        walkId: 'walk-1',
        asset: { uri: 'file:///p.jpg', mimeType: 'image/jpeg' },
      }),
    ).rejects.toMatchObject({ phase: 'presign', cause });
    expect(upload.uploadToPresignedUrl).not.toHaveBeenCalled();
    expect(mockRecordMutateAsync).not.toHaveBeenCalled();
  });

  it('throws PhotoUploadError with phase="upload" when S3 PUT fails', async () => {
    mockPresignMutateAsync.mockResolvedValue({ url: 'u', key: 'k', expiresAt: 'e' });
    const cause = new Error('S3 500');
    (upload.uploadToPresignedUrl as jest.Mock).mockRejectedValue(cause);

    const { result } = renderHook(() => usePhotoUpload());

    await expect(
      result.current.uploadPhoto({
        walkId: 'walk-1',
        asset: { uri: 'file:///p.jpg', mimeType: 'image/jpeg' },
      }),
    ).rejects.toMatchObject({ phase: 'upload', cause });
    expect(mockRecordMutateAsync).not.toHaveBeenCalled();
  });

  it('throws PhotoUploadError with phase="record" when record mutation fails', async () => {
    mockPresignMutateAsync.mockResolvedValue({ url: 'u', key: 'k', expiresAt: 'e' });
    (upload.uploadToPresignedUrl as jest.Mock).mockResolvedValue(undefined);
    const cause = new Error('GraphQL error');
    mockRecordMutateAsync.mockRejectedValue(cause);

    const { result } = renderHook(() => usePhotoUpload());

    await expect(
      result.current.uploadPhoto({
        walkId: 'walk-1',
        asset: { uri: 'file:///p.jpg', mimeType: 'image/jpeg' },
      }),
    ).rejects.toMatchObject({ phase: 'record', cause });
  });

  it('throws a PhotoUploadError instance', async () => {
    mockPresignMutateAsync.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => usePhotoUpload());

    await expect(
      result.current.uploadPhoto({
        walkId: 'walk-1',
        asset: { uri: 'file:///p.jpg', mimeType: 'image/jpeg' },
      }),
    ).rejects.toBeInstanceOf(PhotoUploadError);
  });

  it('isPending is true when presign mutation is pending', () => {
    setupMocks({ presignIsPending: true });
    const { result } = renderHook(() => usePhotoUpload());
    expect(result.current.isPending).toBe(true);
  });

  it('isPending is true when record mutation is pending', () => {
    setupMocks({ recordIsPending: true });
    const { result } = renderHook(() => usePhotoUpload());
    expect(result.current.isPending).toBe(true);
  });

  it('isPending is false when no mutation is pending', () => {
    const { result } = renderHook(() => usePhotoUpload());
    expect(result.current.isPending).toBe(false);
  });
});
