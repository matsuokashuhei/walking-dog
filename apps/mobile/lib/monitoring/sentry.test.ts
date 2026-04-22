import { captureGraphQLError, initSentry, redactSensitive, setSentryUser } from './sentry';

describe('redactSensitive', () => {
  it('masks accessToken and refreshToken inside request body', () => {
    const event = {
      request: {
        data: {
          accessToken: 'secret-access',
          refreshToken: 'secret-refresh',
          other: 'ok',
        },
      },
    } as never;
    const result = redactSensitive(event) as unknown as {
      request: { data: Record<string, string> };
    };
    expect(result.request.data.accessToken).toBe('[Redacted]');
    expect(result.request.data.refreshToken).toBe('[Redacted]');
    expect(result.request.data.other).toBe('ok');
  });

  it('masks tokens inside breadcrumb data but keeps unrelated fields', () => {
    const event = {
      breadcrumbs: [
        { data: { accessToken: 'leak' }, message: 'first' },
        { data: { foo: 'bar' }, message: 'second' },
      ],
    } as never;
    const result = redactSensitive(event) as unknown as {
      breadcrumbs: Array<{ data: Record<string, string>; message: string }>;
    };
    expect(result.breadcrumbs[0].data.accessToken).toBe('[Redacted]');
    expect(result.breadcrumbs[1].data.foo).toBe('bar');
  });

  it('returns events without sensitive fields unchanged', () => {
    const event = { message: 'hello' } as never;
    expect(redactSensitive(event)).toEqual({ message: 'hello' });
  });
});

describe('setSentryUser', () => {
  it('is a no-op when a user is provided or cleared', () => {
    expect(() => {
      setSentryUser({ id: 'user-1', username: 'alice' });
      setSentryUser({ id: 'user-2' });
      setSentryUser(null);
    }).not.toThrow();
  });
});

describe('captureGraphQLError', () => {
  it('is a no-op for Error and non-Error inputs', () => {
    const err = new Error('boom');
    expect(() => {
      captureGraphQLError(err, { operation: 'ListDogs' });
      captureGraphQLError('plain string');
      captureGraphQLError(null);
      captureGraphQLError(undefined);
    }).not.toThrow();
  });
});

describe('initSentry', () => {
  it('is a no-op with Sentry integration disabled', () => {
    expect(() => initSentry()).not.toThrow();
  });
});
