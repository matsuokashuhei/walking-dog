import * as FileSystem from 'expo-file-system/legacy';

/**
 * Uploads a local file to an S3 presigned URL using HTTP PUT.
 */
export async function uploadToPresignedUrl(
  presignedUrl: string,
  fileUri: string,
  contentType: string
): Promise<void> {
  const response = await FileSystem.uploadAsync(presignedUrl, fileUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Upload failed: ${response.status}`);
  }
}

export function normalizeImageContentType(contentType?: string | null): string {
  const normalized = contentType?.split(';', 1)[0]?.trim().toLowerCase();

  if (!normalized) return 'image/jpeg';

  switch (normalized) {
    case 'image/jpg':
    case 'image/pjpeg':
      return 'image/jpeg';
    case 'image/x-png':
      return 'image/png';
    default:
      return normalized;
  }
}
