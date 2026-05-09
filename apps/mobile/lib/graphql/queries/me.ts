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
        createdAt
        updatedAt
      }
    }
  }
`;

export const ME_QUERY = USER_QUERY;
