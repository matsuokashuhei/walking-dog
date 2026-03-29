import { ClientError } from 'graphql-request';
import { isNetworkError } from './errors';

function makeClientError(status: number): ClientError {
  return new ClientError(
    { status, headers: new Headers(), errors: [] },
    { query: '' },
  );
}

describe('isNetworkError', () => {
  it('returns true for TypeError (DNS/connection failure)', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('returns true for ClientError with 500 status', () => {
    expect(isNetworkError(makeClientError(500))).toBe(true);
  });

  it('returns true for ClientError with 503 status', () => {
    expect(isNetworkError(makeClientError(503))).toBe(true);
  });

  it('returns false for ClientError with 401 status', () => {
    expect(isNetworkError(makeClientError(401))).toBe(false);
  });

  it('returns false for ClientError with 400 status', () => {
    expect(isNetworkError(makeClientError(400))).toBe(false);
  });

  it('returns false for generic Error', () => {
    expect(isNetworkError(new Error('something'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isNetworkError('string')).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});
