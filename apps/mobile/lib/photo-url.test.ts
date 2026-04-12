jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { photoCdnUrl: 'https://cdn.example.com' } },
  },
}));

import { getPhotoUrl } from './photo-url';

describe('getPhotoUrl', () => {
  it('returns null for nullish keys', () => {
    expect(getPhotoUrl(null)).toBeNull();
    expect(getPhotoUrl(undefined)).toBeNull();
    expect(getPhotoUrl('')).toBeNull();
  });

  it('returns absolute URLs unchanged', () => {
    expect(getPhotoUrl('https://other.example.com/a.jpg')).toBe('https://other.example.com/a.jpg');
    expect(getPhotoUrl('http://other.example.com/a.jpg')).toBe('http://other.example.com/a.jpg');
  });

  it('prefixes keys with the CDN base URL', () => {
    expect(getPhotoUrl('dogs/abc.jpg')).toBe('https://cdn.example.com/dogs/abc.jpg');
  });
});
