import { gql } from '../gql';

export const REQUEST_ONE_TIME_PASSWORD_MUTATION = gql`
  mutation RequestOneTimePassword($input: RequestOneTimePasswordInput!) {
    requestOneTimePassword(input: $input) {
      email
      session
      codeLength
    }
  }
`;

export const VERIFY_ONE_TIME_PASSWORD_MUTATION = gql`
  mutation VerifyOneTimePassword($input: VerifyOneTimePasswordInput!) {
    verifyOneTimePassword(input: $input) {
      accessToken
      refreshToken
    }
  }
`;

export const CHANGE_EMAIL_MUTATION = gql`
  mutation ChangeEmail($input: ChangeEmailInput!) {
    changeEmail(input: $input) {
      email
      codeLength
    }
  }
`;

export const CONFIRM_EMAIL_CHANGE_MUTATION = gql`
  mutation ConfirmEmailChange($input: ConfirmEmailChangeInput!) {
    confirmEmailChange(input: $input) {
      email
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      accessToken
      refreshToken
    }
  }
`;

export const SIGN_OUT_MUTATION = gql`
  mutation SignOut {
    signOut {
      success
    }
  }
`;
