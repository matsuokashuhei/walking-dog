import Constants from 'expo-constants';

/**
 * Converts an S3 object key to a full URL accessible from the device.
 * Production/dev serves photos via CloudFront; local dev uses LocalStack.
 */
export function getPhotoUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  const base = Constants.expoConfig?.extra?.photoCdnUrl as string | undefined;
  if (!base) return null;
  return `${base}/${key}`;
}
