/**
 * Uploads a local file to an S3 presigned URL using HTTP PUT.
 * The presigned URL is obtained from the API via generateDogPhotoUploadUrl mutation.
 *
 * Local dev note: Docker-internal presigned URL hostnames may not be reachable
 * from a physical device. Replace them with the host machine's LAN IP if needed.
 */
export async function uploadToPresignedUrl(
  presignedUrl: string,
  fileUri: string,
  contentType: string
): Promise<void> {
  const blob = await uriToBlob(fileUri);

  // Local dev: Docker internal hostnames are unreachable from iOS Simulator
  const url = presignedUrl.replace('://minio:', '://localhost:');

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}
