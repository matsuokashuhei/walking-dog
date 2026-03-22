/**
 * Uploads a local file to an S3 presigned URL using HTTP PUT.
 * The presigned URL is obtained from the API via generateDogPhotoUploadUrl mutation.
 *
 * Local dev note: If using localstack, the presigned URL hostname may not be reachable
 * from a physical device. Replace 'localstack' with the host machine's LAN IP.
 */
export async function uploadToPresignedUrl(
  presignedUrl: string,
  fileUri: string,
  contentType: string
): Promise<void> {
  const blob = await uriToBlob(fileUri);

  const response = await fetch(presignedUrl, {
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
