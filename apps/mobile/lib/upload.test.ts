import { uploadToPresignedUrl } from './upload';

global.fetch = jest.fn();

describe('uploadToPresignedUrl', () => {
  beforeEach(() => (fetch as jest.Mock).mockClear());

  it('sends PUT request with binary data to the URL', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ blob: () => Promise.resolve(new Blob()) }) // uriToBlob
      .mockResolvedValueOnce({ ok: true, status: 200 }); // PUT request

    await uploadToPresignedUrl('https://s3.example.com/key', 'file:///tmp/photo.jpg', 'image/jpeg');

    expect(fetch).toHaveBeenCalledWith(
      'https://s3.example.com/key',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
      })
    );
  });

  it('throws on non-OK response', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ blob: () => Promise.resolve(new Blob()) }) // uriToBlob
      .mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' }); // PUT request

    await expect(
      uploadToPresignedUrl('https://s3.example.com/key', 'file:///tmp/photo.jpg', 'image/jpeg')
    ).rejects.toThrow('Upload failed: 403 Forbidden');
  });
});
