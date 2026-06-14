import { graphqlClient } from '../graphql/client';
import {
  REFRESH_TOKEN_MUTATION,
  REQUEST_ONE_TIME_PASSWORD_MUTATION,
  SIGN_OUT_MUTATION,
  VERIFY_ONE_TIME_PASSWORD_MUTATION,
} from '../graphql/mutations/auth';
import { toAuthError } from './errors';

export interface RequestOneTimePasswordResult {
  challengeId: string;
}

export interface AuthTokenResult {
  accessToken: string;
  refreshToken: string;
}

export type RefreshTokenResult = AuthTokenResult;

interface RequestOneTimePasswordResponse {
  requestOneTimePassword: RequestOneTimePasswordResult;
}

interface VerifyOneTimePasswordResponse {
  verifyOneTimePassword: AuthTokenResult;
}

interface RefreshTokenResponse {
  refreshToken: RefreshTokenResult;
}

interface SignOutResponse {
  signOut: { success: boolean };
}

async function mapAuthRequestError<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    throw toAuthError(error);
  }
}

async function mapRefreshTokenRequestError<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    const authError = toAuthError(error);
    if (authError.kind === 'network') {
      throw error;
    }
    throw authError;
  }
}

export async function requestOneTimePassword(
  email: string,
): Promise<RequestOneTimePasswordResult> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<RequestOneTimePasswordResponse>(
      REQUEST_ONE_TIME_PASSWORD_MUTATION,
      {
        input: { email },
      },
    ),
  );
  return data.requestOneTimePassword;
}

export async function verifyOneTimePassword(
  challengeId: string,
  code: string,
): Promise<AuthTokenResult> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<VerifyOneTimePasswordResponse>(
      VERIFY_ONE_TIME_PASSWORD_MUTATION,
      {
        input: { challengeId, code },
      },
    ),
  );
  return data.verifyOneTimePassword;
}

export async function signOut(_accessToken: string): Promise<boolean> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<SignOutResponse>(SIGN_OUT_MUTATION),
  );
  return data.signOut.success;
}

export async function refreshToken(refreshTokenValue: string): Promise<RefreshTokenResult> {
  const data = await mapRefreshTokenRequestError(() =>
    graphqlClient.request<RefreshTokenResponse>(
      REFRESH_TOKEN_MUTATION,
      {
        input: { refreshToken: refreshTokenValue },
      },
    ),
  );
  return data.refreshToken;
}
