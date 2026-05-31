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
        walkGoal {
          id
          dogId
          walkAmount { minutes cycleDays }
          effectiveFrom
          effectiveTo
          createdAt
          updatedAt
        }
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
