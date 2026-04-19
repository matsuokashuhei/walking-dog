import { GraphQLError } from 'graphql';
import { ClientError } from 'graphql-request';
import { graphqlClient } from '../graphql/client';
import { confirmSignUp, signIn, signUp } from './api';

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

  it('signIn returns tokens on success', async () => {
    mockRequest.mockResolvedValue({
      signIn: { accessToken: 'access-token', refreshToken: 'refresh-token' },
    });

    await expect(signIn('user@example.com', 'password123')).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('signIn maps backend auth failures to invalid-credentials', async () => {
    mockRequest.mockRejectedValue(makeClientError('NotAuthorizedException'));

    await expect(signIn('user@example.com', 'wrong')).rejects.toMatchObject({
      kind: 'invalid-credentials',
    });
  });

  it('signUp returns the signup result on success', async () => {
    mockRequest.mockResolvedValue({ signUp: { success: true, userConfirmed: false } });

    await expect(signUp('user@example.com', 'password123', 'Taro')).resolves.toEqual({
      success: true,
      userConfirmed: false,
    });
  });

  it('signUp maps duplicate users to user-exists', async () => {
    mockRequest.mockRejectedValue(makeClientError('USER_EXISTS'));

    await expect(signUp('user@example.com', 'password123', 'Taro')).rejects.toMatchObject({
      kind: 'user-exists',
    });
  });

  it('confirmSignUp resolves with the server response on success', async () => {
    mockRequest.mockResolvedValue({ confirmSignUp: true });

    await expect(confirmSignUp('user@example.com', '123456')).resolves.toBe(true);
  });

  it('confirmSignUp maps expired codes to code-mismatch', async () => {
    mockRequest.mockRejectedValue(makeClientError('EXPIRED_CODE'));

    await expect(confirmSignUp('user@example.com', '123456')).rejects.toMatchObject({
      kind: 'code-mismatch',
      reason: 'expired',
    });
  });
});
