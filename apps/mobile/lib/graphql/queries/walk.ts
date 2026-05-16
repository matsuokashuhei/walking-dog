import { gql } from '../gql';

const WALK_FIELDS = gql`
  fragment WalkFields on Walk {
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

export const WALK_QUERY = gql`
  ${WALK_FIELDS}
  query Walk($id: UUID!) {
    walk(id: $id) {
      ...WalkFields
    }
  }
`;

export const WALKS_QUERY = gql`
  ${WALK_FIELDS}
  query Walks($first: Int, $after: String) {
    user {
      walks(first: $first, after: $after) {
        nodes {
          ...WalkFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;
