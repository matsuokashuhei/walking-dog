import { graphqlClient } from '../graphql/client';
import {
  SIGN_UP_MUTATION,
  CONFIRM_SIGN_UP_MUTATION,
  FORGOT_PASSWORD_MUTATION,
  CONFIRM_FORGOT_PASSWORD_MUTATION,
  SIGN_IN_MUTATION,
  REFRESH_TOKEN_MUTATION,
} from '../graphql/mutations/auth';
import { toAuthError } from './errors';

export interface SignUpResult {
  success: boolean;
  userConfirmed: boolean;
}

export interface SignInResult {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

interface SignUpResponse {
  signUp: SignUpResult;
}

interface ConfirmSignUpResponse {
  confirmSignUp: { success: boolean };
}

interface ForgotPasswordResponse {
  forgotPassword: { success: boolean };
}

interface ConfirmForgotPasswordResponse {
  confirmForgotPassword: { success: boolean };
}

interface SignInResponse {
  signIn: SignInResult;
}

interface RefreshTokenResponse {
  refreshToken: RefreshTokenResult;
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

export async function signUp(
  email: string,
  password: string,
  _displayName: string
): Promise<SignUpResult> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<SignUpResponse>(SIGN_UP_MUTATION, {
      input: { email, password },
    })
  );
  return { ...data.signUp, userConfirmed: false };
}

export async function confirmSignUp(email: string, code: string): Promise<boolean> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<ConfirmSignUpResponse>(CONFIRM_SIGN_UP_MUTATION, {
      input: { email, code },
    })
  );
  return data.confirmSignUp.success;
}

export async function forgotPassword(email: string): Promise<boolean> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<ForgotPasswordResponse>(FORGOT_PASSWORD_MUTATION, {
      input: { email },
    })
  );
  return data.forgotPassword.success;
}

export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<boolean> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<ConfirmForgotPasswordResponse>(
      CONFIRM_FORGOT_PASSWORD_MUTATION,
      {
        input: { email, code, newPassword },
      },
    )
  );
  return data.confirmForgotPassword.success;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<SignInResponse>(SIGN_IN_MUTATION, {
      input: { email, password },
    })
  );
  return data.signIn;
}

export async function signOut(_accessToken: string): Promise<boolean> {
  return true;
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
