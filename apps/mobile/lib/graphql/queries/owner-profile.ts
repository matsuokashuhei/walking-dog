import { gql } from '../gql';

export const OWNER_PROFILE_QUERY = gql`
  query OwnerProfile($first: Int) {
    user {
      id
      name
      avatar
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
      walks(first: $first) {
        totalCount
        totalDistance
        totalDuration
        nodes {
          id
          startedAt
          endedAt
          distance
        }
      }
    }
  }
`;
