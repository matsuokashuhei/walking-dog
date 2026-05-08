import { renderHook } from '@testing-library/react-native';
import { usePhotoUpload, PhotoUploadError } from './use-photo-upload';

describe('usePhotoUpload', () => {
  it('throws PhotoUploadError without issuing an upload because photo upload is unsupported', async () => {
    const { result } = renderHook(() => usePhotoUpload());

    await expect(
      result.current.uploadPhoto({
        walkId: 'walk-1',
        dogId: 'dog-1',
        asset: { uri: 'file:///photo.jpg', mimeType: 'image/jpeg' },
        latestPoint: { lat: 35.68, lng: 139.76 },
      }),
    ).rejects.toMatchObject({ phase: 'presign' });
  });

  it('throws a PhotoUploadError instance', async () => {
    const { result } = renderHook(() => usePhotoUpload());

    await expect(
      result.current.uploadPhoto({
        walkId: 'walk-1',
        asset: { uri: 'file:///p.jpg', mimeType: 'image/jpeg' },
      }),
    ).rejects.toBeInstanceOf(PhotoUploadError);
  });

  it('isPending is false while the unsupported path has no API mutation', () => {
    const { result } = renderHook(() => usePhotoUpload());
    expect(result.current.isPending).toBe(false);
  });
});
