import { gql } from '../gql';

export const USER_QUERY = gql`
  query User {
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
    }
  }
`;
