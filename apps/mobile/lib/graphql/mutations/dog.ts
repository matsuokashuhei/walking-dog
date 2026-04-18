import { gql } from 'graphql-request';

export const CREATE_DOG_MUTATION = gql`
  mutation CreateDog($input: CreateDogInput!) {
    createDog(input: $input) {
      id
      name
      breed
      gender
      birthDate { year month day }
      photoUrl
      createdAt
    }
  }
`;

export const UPDATE_DOG_MUTATION = gql`
  mutation UpdateDog($id: ID!, $input: UpdateDogInput!) {
    updateDog(id: $id, input: $input) {
      id
      name
      breed
      gender
      birthDate { year month day }
      photoUrl
    }
  }
`;

export const DELETE_DOG_MUTATION = gql`
  mutation DeleteDog($id: ID!) {
    deleteDog(id: $id)
  }
`;

export const GENERATE_DOG_PHOTO_UPLOAD_URL_MUTATION = gql`
  mutation GenerateDogPhotoUploadUrl($dogId: ID!, $contentType: String!) {
    generateDogPhotoUploadUrl(dogId: $dogId, contentType: $contentType) {
      url
      key
      expiresAt
    }
  }
`;

export const GENERATE_DOG_INVITATION_MUTATION = gql`
  mutation GenerateDogInvitation($dogId: ID!) {
    generateDogInvitation(dogId: $dogId) {
      id
      token
      expiresAt
    }
  }
`;

export const ACCEPT_DOG_INVITATION_MUTATION = gql`
  mutation AcceptDogInvitation($token: String!) {
    acceptDogInvitation(token: $token) {
      id
      name
    }
  }
`;

export const REMOVE_DOG_MEMBER_MUTATION = gql`
  mutation RemoveDogMember($dogId: ID!, $userId: ID!) {
    removeDogMember(dogId: $dogId, userId: $userId)
  }
`;

export const LEAVE_DOG_MUTATION = gql`
  mutation LeaveDog($dogId: ID!) {
    leaveDog(dogId: $dogId)
  }
`;
