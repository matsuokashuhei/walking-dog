import { gql } from 'graphql-request';

export const DOG_ENCOUNTERS_QUERY = gql`
  query DogEncounters($dogId: ID!, $limit: Int, $offset: Int) {
    dogEncounters(dogId: $dogId, limit: $limit, offset: $offset) {
      id
      durationSec
      metAt
      dog1 { id name photoUrl }
      dog2 { id name photoUrl }
    }
  }
`;
