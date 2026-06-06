import { gql } from '../gql';

export const USER_PROFILE_QUERY = gql`
  query UserProfile($first: Int) {
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
