import * as Sentry from '@sentry/react-native';

import { captureGraphQLError, redactSensitive, setSentryUser } from './sentry';

jest.mock('@sentry/react-native', () => ({
  setUser: jest.fn(),
  captureException: jest.fn(),
}));

const setUserMock = Sentry.setUser as jest.MockedFunction<typeof Sentry.setUser>;
const captureExceptionMock = Sentry.captureException as jest.MockedFunction<typeof Sentry.captureException>;

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
  beforeEach(() => {
    setUserMock.mockClear();
  });

  it('forwards id and username when user is provided', () => {
    setSentryUser({ id: 'user-1', username: 'alice' });
    expect(setUserMock).toHaveBeenCalledWith({ id: 'user-1', username: 'alice' });
  });

  it('calls Sentry.setUser with null to clear scope when user is null', () => {
    setSentryUser(null);
    expect(setUserMock).toHaveBeenCalledWith(null);
  });

  it('omits username when not provided', () => {
    setSentryUser({ id: 'user-2' });
    expect(setUserMock).toHaveBeenCalledWith({ id: 'user-2', username: undefined });
  });
});

describe('captureGraphQLError', () => {
  beforeEach(() => {
    captureExceptionMock.mockClear();
  });

  it('reports Error instances with context as extras', () => {
    const err = new Error('boom');
    captureGraphQLError(err, { operation: 'ListDogs' });
    expect(captureExceptionMock).toHaveBeenCalledWith(err, { extra: { operation: 'ListDogs' } });
  });

  it('ignores non-Error inputs to avoid noise', () => {
    captureGraphQLError('plain string');
    captureGraphQLError(null);
    captureGraphQLError(undefined);
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });
});
