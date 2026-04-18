import { gql } from 'graphql-request';

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      displayName
      avatarUrl
    }
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
