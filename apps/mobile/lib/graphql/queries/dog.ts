import { gql } from 'graphql-request';

export const DOG_QUERY = gql`
  query Dog($id: ID!, $statsPeriod: String!) {
    dog(id: $id) {
      id
      name
      breed
      gender
      birthDate { year month day }
      photoUrl
      createdAt
      walkStats(period: $statsPeriod) {
        totalWalks
        totalDistanceM
        totalDurationSec
      }
      members {
        id
        userId
        role
        user {
          displayName
          avatarUrl
        }
        createdAt
      }
    }
  }
`;
