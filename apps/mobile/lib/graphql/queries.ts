import { gql } from 'graphql-request';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      displayName
      avatarUrl
      dogs {
        id
        name
        breed
        gender
        birthDate { year month day }
        photoUrl
        createdAt
      }
      createdAt
    }
  }
`;

export const DOG_QUERY = gql`
  query Dog($id: ID!, $statsPeriod: StatsPeriod!) {
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
      walks(limit: 10) {
        id
        status
        distanceM
        durationSec
        startedAt
        endedAt
        dogs { id name photoUrl }
      }
    }
  }
`;

export const WALK_QUERY = gql`
  query Walk($id: ID!) {
    walk(id: $id) {
      id
      dogs { id name photoUrl }
      status
      distanceM
      durationSec
      startedAt
      endedAt
      points { lat lng recordedAt }
    }
  }
`;

export const MY_WALKS_QUERY = gql`
  query MyWalks($limit: Int, $offset: Int) {
    myWalks(limit: $limit, offset: $offset) {
      id
      dogs { id name photoUrl }
      status
      distanceM
      durationSec
      startedAt
      endedAt
    }
  }
`;
