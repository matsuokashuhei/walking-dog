import { gql } from '../gql';

export const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
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
