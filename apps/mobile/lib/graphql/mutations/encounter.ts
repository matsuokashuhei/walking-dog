import { gql } from 'graphql-request';

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
