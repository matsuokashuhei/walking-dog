import { API_BASE_URL, PRIVACY_POLICY_URL, TERMS_URL } from './legal-urls';

describe('legal URLs', () => {
  it('uses the walking-dog cacheandbuffer origin', () => {
    expect(API_BASE_URL).toBe('https://walking-dog.cacheandbuffer.com');
    expect(TERMS_URL).toBe('https://walking-dog.cacheandbuffer.com/terms');
    expect(PRIVACY_POLICY_URL).toBe(
      'https://walking-dog.cacheandbuffer.com/policy',
    );
  });
});
