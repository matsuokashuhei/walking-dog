import { GraphQLError } from 'graphql';
import { isAuthError, toAuthError } from './errors';
import { ClientError } from '../graphql/client-error';

function makeClientError(message: string, status = 200): ClientError {
  return new ClientError(
    { status, headers: new Headers(), errors: [new GraphQLError(message)], body: '' },
    { query: '' },
  );
}

describe('isAuthError', () => {
  it('returns true for typed auth errors', () => {
    expect(isAuthError({ kind: 'invalid-credentials' })).toBe(true);
    expect(isAuthError({ kind: 'code-mismatch', reason: 'expired' })).toBe(true);
  });

  it('returns false for non-auth errors', () => {
    expect(isAuthError(new Error('AUTH_ERROR'))).toBe(false);
    expect(isAuthError({ kind: 'not-auth' })).toBe(false);
  });
});

describe('toAuthError', () => {
  it('maps invalid credential messages to invalid-credentials', () => {
    expect(toAuthError(makeClientError('NotAuthorizedException'))).toMatchObject({
      kind: 'invalid-credentials',
    });
  });

  it('maps user exists messages to user-exists', () => {
    expect(toAuthError(makeClientError('USER_EXISTS'))).toMatchObject({
      kind: 'user-exists',
    });
  });

  it('maps invalid password messages to invalid-password', () => {
    expect(toAuthError(makeClientError('INVALID_PASSWORD'))).toMatchObject({
      kind: 'invalid-password',
    });
  });

  it('maps invalid confirmation codes to code-mismatch invalid', () => {
    expect(toAuthError(makeClientError('INVALID_CODE'))).toMatchObject({
      kind: 'code-mismatch',
      reason: 'invalid',
    });
  });

  it('maps expired confirmation codes to code-mismatch expired', () => {
    expect(toAuthError(makeClientError('EXPIRED_CODE'))).toMatchObject({
      kind: 'code-mismatch',
      reason: 'expired',
    });
  });

  it('maps network failures to network', () => {
    expect(toAuthError(new TypeError('Failed to fetch'))).toMatchObject({
      kind: 'network',
    });
  });

  it('returns unknown for unrecognized errors', () => {
    expect(toAuthError(new Error('unexpected failure'))).toMatchObject({
      kind: 'unknown',
    });
  });

  it('returns auth errors unchanged', () => {
    const authError = { kind: 'network' } as const;
    expect(toAuthError(authError)).toBe(authError);
  });
});
