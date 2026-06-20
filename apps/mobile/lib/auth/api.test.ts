import { GraphQLError } from 'graphql';
import { graphqlClient } from '../graphql/client';
import { ClientError } from '../graphql/client-error';
import {
  refreshToken,
  signOut,
  requestOneTimePassword,
  verifyOneTimePassword,
} from './api';

jest.mock('../graphql/client', () => ({
  graphqlClient: {
    request: jest.fn(),
  },
}));

function makeClientError(message: string, status = 200): ClientError {
  return new ClientError(
    { status, headers: new Headers(), errors: [new GraphQLError(message)], body: '' },
    { query: '' },
  );
}

const mockRequest = graphqlClient.request as jest.Mock;

describe('auth api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requestOneTimePassword starts an email one-time password challenge', async () => {
    mockRequest.mockResolvedValue({
      requestOneTimePassword: {
        email: 'user@example.com',
        session: 'otp-session',
      },
    });

    await expect(requestOneTimePassword('user@example.com')).resolves.toEqual({
      email: 'user@example.com',
      session: 'otp-session',
    });
    expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
      input: { email: 'user@example.com' },
    });
  });

  it('requestOneTimePassword maps backend auth failures to invalid-credentials', async () => {
    mockRequest.mockRejectedValue(makeClientError('NotAuthorizedException'));

    await expect(requestOneTimePassword('user@example.com')).rejects.toMatchObject({
      kind: 'invalid-credentials',
    });
  });

  it('verifyOneTimePassword returns tokens on success', async () => {
    mockRequest.mockResolvedValue({
      verifyOneTimePassword: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });

    await expect(
      verifyOneTimePassword({
        email: 'user@example.com',
        session: 'otp-session',
        code: '12345678',
      }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
      input: {
        email: 'user@example.com',
        session: 'otp-session',
        code: '12345678',
      },
    });
  });

  it('verifyOneTimePassword maps expired codes to code-mismatch', async () => {
    mockRequest.mockRejectedValue(makeClientError('ExpiredCodeException'));

    await expect(
      verifyOneTimePassword({
        email: 'user@example.com',
        session: 'otp-session',
        code: '12345678',
      }),
    ).rejects.toMatchObject({
      kind: 'code-mismatch',
      reason: 'expired',
    });
  });

  it('signOut calls the authenticated sign out mutation', async () => {
    mockRequest.mockResolvedValue({ signOut: { success: true } });

    await expect(signOut('access-token')).resolves.toBe(true);
    expect(mockRequest).toHaveBeenCalledWith(expect.any(String));
  });

  it('refreshToken returns refreshed tokens on success', async () => {
    mockRequest.mockResolvedValue({
      refreshToken: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' },
    });

    await expect(refreshToken('old-refresh-token')).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      {
        input: { refreshToken: 'old-refresh-token' },
      },
    );
  });

  it('refreshToken maps backend auth failures to invalid-credentials', async () => {
    mockRequest.mockRejectedValue(makeClientError('NotAuthorizedException'));

    await expect(refreshToken('expired-refresh-token')).rejects.toMatchObject({
      kind: 'invalid-credentials',
    });
  });

  it('refreshToken preserves network failures so auth refresh can retry them', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockRequest.mockRejectedValue(networkError);

    await expect(refreshToken('old-refresh-token')).rejects.toBe(networkError);
  });
});
