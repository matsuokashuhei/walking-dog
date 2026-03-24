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

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      displayName
      avatarUrl
    }
  }
`;

export const CREATE_DOG_MUTATION = gql`
  mutation CreateDog($input: CreateDogInput!) {
    createDog(input: $input) {
      id
      name
      breed
      gender
      birthDate { year month day }
      photoUrl
      createdAt
    }
  }
`;

export const UPDATE_DOG_MUTATION = gql`
  mutation UpdateDog($id: ID!, $input: UpdateDogInput!) {
    updateDog(id: $id, input: $input) {
      id
      name
      breed
      gender
      birthDate { year month day }
      photoUrl
    }
  }
`;

export const DELETE_DOG_MUTATION = gql`
  mutation DeleteDog($id: ID!) {
    deleteDog(id: $id)
  }
`;

export const GENERATE_DOG_PHOTO_UPLOAD_URL_MUTATION = gql`
  mutation GenerateDogPhotoUploadUrl($dogId: ID!) {
    generateDogPhotoUploadUrl(dogId: $dogId) {
      url
      key
      expiresAt
    }
  }
`;

export const START_WALK_MUTATION = gql`
  mutation StartWalk($dogIds: [ID!]!) {
    startWalk(dogIds: $dogIds) {
      id
      dogs { id name photoUrl }
      status
      startedAt
    }
  }
`;

export const ADD_WALK_POINTS_MUTATION = gql`
  mutation AddWalkPoints($walkId: ID!, $points: [WalkPointInput!]!) {
    addWalkPoints(walkId: $walkId, points: $points)
  }
`;

export const FINISH_WALK_MUTATION = gql`
  mutation FinishWalk($walkId: ID!, $distanceM: Int) {
    finishWalk(walkId: $walkId, distanceM: $distanceM) {
      id
      status
      distanceM
      durationSec
      startedAt
      endedAt
    }
  }
`;
