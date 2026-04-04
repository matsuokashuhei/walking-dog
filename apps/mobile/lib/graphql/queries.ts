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

export const WALK_QUERY = gql`
  query Walk($id: ID!) {
    walk(id: $id) {
      id
      dogs { id name photoUrl }
      walker { id displayName avatarUrl }
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
      walker { id displayName avatarUrl }
      status
      distanceM
      durationSec
      startedAt
      endedAt
    }
  }
`;
