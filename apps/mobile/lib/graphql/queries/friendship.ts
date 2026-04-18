import { gql } from 'graphql-request';

export const DOG_FRIENDS_QUERY = gql`
  query DogFriends($dogId: ID!) {
    dogFriends(dogId: $dogId) {
      id
      encounterCount
      totalInteractionSec
      firstMetAt
      lastMetAt
      friend {
        id
        name
        breed
        photoUrl
      }
    }
  }
`;

export const FRIENDSHIP_QUERY = gql`
  query Friendship($dogId1: ID!, $dogId2: ID!) {
    friendship(dogId1: $dogId1, dogId2: $dogId2) {
      id
      encounterCount
      totalInteractionSec
      firstMetAt
      lastMetAt
      friend {
        id
        name
        breed
        photoUrl
      }
    }
  }
`;
