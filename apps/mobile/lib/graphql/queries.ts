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
      events { id walkId dogId eventType occurredAt lat lng photoUrl }
    }
  }
`;

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
