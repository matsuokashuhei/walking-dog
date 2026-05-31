import { gql } from '../gql';

const DOG_FIELDS = gql`
  fragment DogFields on Dog {
    id
    name
    breed
    gender
    avatar
    birthday { year month day }
    walkGoal {
      id
      dogId
      walkAmount { minutes cycleDays }
      effectiveFrom
      effectiveTo
      createdAt
      updatedAt
    }
    createdAt
    updatedAt
  }
`;

export const ADD_DOG_MUTATION = gql`
  ${DOG_FIELDS}
  mutation AddDog($input: AddDogInput!) {
    addDog(input: $input) {
      ...DogFields
    }
  }
`;

export const UPDATE_DOG_MUTATION = gql`
  ${DOG_FIELDS}
  mutation UpdateDog($input: UpdateDogInput!) {
    updateDog(input: $input) {
      ...DogFields
    }
  }
`;

export const REMOVE_DOG_MUTATION = gql`
  ${DOG_FIELDS}
  mutation RemoveDog($input: RemoveDogInput!) {
    removeDog(input: $input) {
      ...DogFields
    }
  }
`;
