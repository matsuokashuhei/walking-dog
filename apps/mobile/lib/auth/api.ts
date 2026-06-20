import { authenticatedRequest, graphqlClient } from '../graphql/client';
import {
  CHANGE_EMAIL_MUTATION,
  CONFIRM_EMAIL_CHANGE_MUTATION,
  REQUEST_ONE_TIME_PASSWORD_MUTATION,
  VERIFY_ONE_TIME_PASSWORD_MUTATION,
  REFRESH_TOKEN_MUTATION,
  SIGN_OUT_MUTATION,
} from '../graphql/mutations/auth';
import { toAuthError } from './errors';

export interface OneTimePasswordChallenge {
  email: string;
  session: string;
  codeLength: number;
}

export interface VerifyOneTimePasswordInput {
  email: string;
  session: string;
  code: string;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export type RefreshTokenResult = AuthTokenPair;

export interface EmailChangeChallenge {
  email: string;
  codeLength: number;
}

export interface EmailChangeConfirmation {
  email: string;
}

interface RequestOneTimePasswordResponse {
  requestOneTimePassword: OneTimePasswordChallenge;
}

interface VerifyOneTimePasswordResponse {
  verifyOneTimePassword: AuthTokenPair;
}

interface RefreshTokenResponse {
  refreshToken: RefreshTokenResult;
}

interface SignOutResponse {
  signOut: { success: boolean };
}

interface ChangeEmailResponse {
  changeEmail: EmailChangeChallenge;
}

interface ConfirmEmailChangeResponse {
  confirmEmailChange: EmailChangeConfirmation;
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

export async function requestOneTimePassword(email: string): Promise<OneTimePasswordChallenge> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<RequestOneTimePasswordResponse>(REQUEST_ONE_TIME_PASSWORD_MUTATION, {
      input: { email },
    })
  );
  return data.requestOneTimePassword;
}

export async function verifyOneTimePassword(
  input: VerifyOneTimePasswordInput,
): Promise<AuthTokenPair> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<VerifyOneTimePasswordResponse>(
      VERIFY_ONE_TIME_PASSWORD_MUTATION,
      {
        input,
      },
    )
  );
  return data.verifyOneTimePassword;
}

export async function changeEmail(newEmail: string): Promise<EmailChangeChallenge> {
  const data = await mapAuthRequestError(() =>
    authenticatedRequest<ChangeEmailResponse>(CHANGE_EMAIL_MUTATION, {
      input: { newEmail },
    })
  );
  return data.changeEmail;
}

export async function confirmEmailChange(code: string): Promise<EmailChangeConfirmation> {
  const data = await mapAuthRequestError(() =>
    authenticatedRequest<ConfirmEmailChangeResponse>(CONFIRM_EMAIL_CHANGE_MUTATION, {
      input: { code },
    })
  );
  return data.confirmEmailChange;
}

export async function signOut(_accessToken: string): Promise<boolean> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<SignOutResponse>(SIGN_OUT_MUTATION)
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
    )
  );
  return data.refreshToken;
}
