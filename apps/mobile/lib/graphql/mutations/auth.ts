import { gql } from '../gql';

export const SIGN_UP_MUTATION = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      success
    }
  }
`;

export const CONFIRM_SIGN_UP_MUTATION = gql`
  mutation ConfirmSignUp($input: ConfirmSignUpInput!) {
    confirmSignUp(input: $input) {
      success
    }
  }
`;

export const SIGN_IN_MUTATION = gql`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      accessToken
      refreshToken
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

export const CHANGE_EMAIL_MUTATION = gql`
  mutation ChangeEmail($input: ChangeEmailInput!) {
    changeEmail(input: $input) {
      success
    }
  }
`;

export const CONFIRM_EMAIL_CHANGE_MUTATION = gql`
  mutation ConfirmEmailChange($input: ConfirmEmailChangeInput!) {
    confirmEmailChange(input: $input) {
      success
    }
  }
`;

export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) {
      success
    }
  }
`;
