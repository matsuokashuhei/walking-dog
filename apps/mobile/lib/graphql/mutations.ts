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

export const GENERATE_DOG_INVITATION_MUTATION = gql`
  mutation GenerateDogInvitation($dogId: ID!) {
    generateDogInvitation(dogId: $dogId) {
      id
      token
      expiresAt
    }
  }
`;

export const ACCEPT_DOG_INVITATION_MUTATION = gql`
  mutation AcceptDogInvitation($token: String!) {
    acceptDogInvitation(token: $token) {
      id
      name
    }
  }
`;

export const REMOVE_DOG_MEMBER_MUTATION = gql`
  mutation RemoveDogMember($dogId: ID!, $userId: ID!) {
    removeDogMember(dogId: $dogId, userId: $userId)
  }
`;

export const LEAVE_DOG_MUTATION = gql`
  mutation LeaveDog($dogId: ID!) {
    leaveDog(dogId: $dogId)
  }
`;

export const UPDATE_ENCOUNTER_DETECTION_MUTATION = gql`
  mutation UpdateEncounterDetection($enabled: Boolean!) {
    updateEncounterDetection(enabled: $enabled) {
      id
      encounterDetectionEnabled
    }
  }
`;

export const RECORD_ENCOUNTER_MUTATION = gql`
  mutation RecordEncounter($myWalkId: ID!, $theirWalkId: ID!) {
    recordEncounter(myWalkId: $myWalkId, theirWalkId: $theirWalkId) {
      id
      durationSec
      metAt
      dog1 { id name }
      dog2 { id name }
    }
  }
`;

export const UPDATE_ENCOUNTER_DURATION_MUTATION = gql`
  mutation UpdateEncounterDuration($myWalkId: ID!, $theirWalkId: ID!, $durationSec: Int!) {
    updateEncounterDuration(myWalkId: $myWalkId, theirWalkId: $theirWalkId, durationSec: $durationSec)
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
