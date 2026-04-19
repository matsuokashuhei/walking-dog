import { gql } from 'graphql-request';

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
      events { id eventType }
    }
  }
`;
