import { gql } from 'graphql-request';

export const SIGN_UP_MUTATION = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      success
      userConfirmed
    }
  }
`;

export const CONFIRM_SIGN_UP_MUTATION = gql`
  mutation ConfirmSignUp($input: ConfirmSignUpInput!) {
    confirmSignUp(input: $input)
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

export const SIGN_OUT_MUTATION = gql`
  mutation SignOut($accessToken: String!) {
    signOut(accessToken: $accessToken)
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
