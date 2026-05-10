import { gql } from '../gql';

const WALK_FIELDS = gql`
  fragment MutationWalkFields on Walk {
    id
    startedAt
    endedAt
    distance
    createdAt
    updatedAt
    dogs {
      id
      name
      breed
      gender
      avatar
      birthday { year month day }
      createdAt
      updatedAt
    }
    walkDogs {
      id
      walkId
      dogId
      createdAt
      updatedAt
      dog {
        id
        name
        breed
        gender
        avatar
        birthday { year month day }
        createdAt
        updatedAt
      }
      events {
        id
        walkDogId
        event
        occurredAt
        coordinate { latitude longitude }
        createdAt
        updatedAt
      }
    }
    photos {
      id
      walkId
      occurredAt
      file
      coordinate { latitude longitude }
      createdAt
      updatedAt
    }
    trackPoints {
      walkId
      trackedAt
      coordinate { latitude longitude }
    }
  }
`;

export const START_WALK_MUTATION = gql`
  ${WALK_FIELDS}
  mutation StartWalk($input: StartWalkInput!) {
    startWalk(input: $input) {
      ...MutationWalkFields
    }
  }
`;

export const END_WALK_MUTATION = gql`
  ${WALK_FIELDS}
  mutation EndWalk($input: EndWalkInput!) {
    endWalk(input: $input) {
      ...MutationWalkFields
    }
  }
`;

export const TRACK_POINT_MUTATION = gql`
  mutation TrackPoint($input: TrackPointInput!) {
    trackPoint(input: $input) {
      walkId
      trackedAt
        acceptedAt
    }
  }
`;

export const ADD_EVENT_MUTATION = gql`
  mutation AddEvent($input: AddEventInput!) {
    addEvent(input: $input) {
      id
      walkDogId
      event
      occurredAt
      coordinate { latitude longitude }
      createdAt
      updatedAt
    }
  }
`;

export const TAKE_PHOTO_MUTATION = gql`
  mutation TakePhoto($input: TakePhotoInput!) {
    takePhoto(input: $input) {
      id
      walkId
      occurredAt
      file
      coordinate { latitude longitude }
      createdAt
      updatedAt
    }
  }
`;

export const FINISH_WALK_MUTATION = END_WALK_MUTATION;
export const ADD_WALK_POINTS_MUTATION = TRACK_POINT_MUTATION;
export const RECORD_WALK_EVENT_MUTATION = ADD_EVENT_MUTATION;
