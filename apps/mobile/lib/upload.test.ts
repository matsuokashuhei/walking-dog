import { normalizeImageContentType, uploadToPresignedUrl } from './upload';
import * as FileSystem from 'expo-file-system/legacy';

jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  uploadAsync: jest.fn(),
}));

describe('uploadToPresignedUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads the local file as a binary PUT request', async () => {
    (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({ status: 200 });

    await uploadToPresignedUrl('https://s3.example.com/key', 'file:///tmp/photo.jpg', 'image/jpeg');

    expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
      'https://s3.example.com/key',
      'file:///tmp/photo.jpg',
      {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': 'image/jpeg' },
      },
    );
  });

  it('throws on non-2xx response', async () => {
    (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({ status: 403 });

    await expect(
      uploadToPresignedUrl('https://s3.example.com/key', 'file:///tmp/photo.jpg', 'image/jpeg')
    ).rejects.toThrow('Upload failed: 403');
  });

  it('passes through MinIO presigned URLs unchanged', async () => {
    (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({ status: 204 });

    await uploadToPresignedUrl(
      'http://minio:9000/dog-photos/key?X-Amz-Signature=test',
      'file:///tmp/photo.jpg',
      'image/jpeg'
    );

    expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
      'http://minio:9000/dog-photos/key?X-Amz-Signature=test',
      'file:///tmp/photo.jpg',
      expect.objectContaining({ httpMethod: 'PUT' }),
    );
  });
});

describe('normalizeImageContentType', () => {
  it.each([
    [null, 'image/jpeg'],
    [undefined, 'image/jpeg'],
    ['', 'image/jpeg'],
    ['image/jpg', 'image/jpeg'],
    ['image/pjpeg', 'image/jpeg'],
    ['image/x-png', 'image/png'],
    ['IMAGE/JPEG', 'image/jpeg'],
    ['image/jpeg; charset=binary', 'image/jpeg'],
    ['image/heic', 'image/heic'],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizeImageContentType(input)).toBe(expected);
  });
});
