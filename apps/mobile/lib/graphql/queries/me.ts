import { gql } from 'graphql-request';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      displayName
      avatarUrl
      encounterDetectionEnabled
      dogs {
        id
        name
        breed
        gender
        birthDate { year month day }
        photoUrl
        role
        createdAt
        latestWalk { endedAt }
      }
      createdAt
    }
  }
`;
