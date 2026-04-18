import { gql } from 'graphql-request';

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

export const RECORD_WALK_EVENT_MUTATION = gql`
  mutation RecordWalkEvent($input: RecordWalkEventInput!) {
    recordWalkEvent(input: $input) {
      id
      walkId
      dogId
      eventType
      occurredAt
      lat
      lng
      photoUrl
    }
  }
`;

export const GENERATE_WALK_EVENT_PHOTO_UPLOAD_URL_MUTATION = gql`
  mutation GenerateWalkEventPhotoUploadUrl($walkId: ID!, $contentType: String!) {
    generateWalkEventPhotoUploadUrl(walkId: $walkId, contentType: $contentType) {
      url
      key
      expiresAt
    }
  }
`;
