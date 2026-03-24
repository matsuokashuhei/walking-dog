import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';
const S3_ENDPOINT = API_URL.replace(':3000', ':4566');
const S3_BUCKET = 'dog-photos';

/**
 * Converts an S3 object key to a full URL accessible from the device.
 * In local dev, S3 is served by LocalStack on port 4566.
 */
export function getPhotoUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  return `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
}
