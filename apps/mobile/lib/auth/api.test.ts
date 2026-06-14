import { GraphQLError } from 'graphql';
import { graphqlClient } from '../graphql/client';
import { ClientError } from '../graphql/client-error';
import {
  refreshToken,
  requestOneTimePassword,
  signOut,
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

  it('requestOneTimePassword returns a challenge id', async () => {
    mockRequest.mockResolvedValue({
      requestOneTimePassword: { challengeId: 'challenge-id' },
    });

    await expect(requestOneTimePassword('owner@example.com')).resolves.toEqual({
      challengeId: 'challenge-id',
    });
    expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
      input: { email: 'owner@example.com' },
    });
  });

  it('requestOneTimePassword maps network failures', async () => {
    mockRequest.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(requestOneTimePassword('owner@example.com')).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('verifyOneTimePassword returns tokens on success', async () => {
    mockRequest.mockResolvedValue({
      verifyOneTimePassword: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });

    await expect(verifyOneTimePassword('challenge-id', '123456')).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
      input: { challengeId: 'challenge-id', code: '123456' },
    });
  });

  it('verifyOneTimePassword maps invalid codes to code-mismatch', async () => {
    mockRequest.mockRejectedValue(makeClientError('INVALID_CODE'));

    await expect(verifyOneTimePassword('challenge-id', '000000')).rejects.toMatchObject({
      kind: 'code-mismatch',
      reason: 'invalid',
    });
  });

  it('verifyOneTimePassword maps expired codes to code-mismatch', async () => {
    mockRequest.mockRejectedValue(makeClientError('EXPIRED_CODE'));

    await expect(verifyOneTimePassword('challenge-id', '123456')).rejects.toMatchObject({
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
