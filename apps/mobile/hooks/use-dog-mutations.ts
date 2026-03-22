import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import {
  CREATE_DOG_MUTATION,
  UPDATE_DOG_MUTATION,
  DELETE_DOG_MUTATION,
  GENERATE_DOG_PHOTO_UPLOAD_URL_MUTATION,
} from '@/lib/graphql/mutations';
import { meKeys, dogKeys } from '@/lib/graphql/keys';
import type {
  CreateDogInput,
  UpdateDogInput,
  Dog,
  PresignedUrl,
  CreateDogResponse,
  UpdateDogResponse,
  DeleteDogResponse,
  GenerateDogPhotoUploadUrlResponse,
} from '@/types/graphql';

export function useCreateDog() {
  const queryClient = useQueryClient();
  return useMutation<Dog, Error, CreateDogInput>({
    mutationFn: async (input) => {
      const data = await graphqlClient.request<CreateDogResponse>(CREATE_DOG_MUTATION, { input });
      return data.createDog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}

export function useUpdateDog() {
  const queryClient = useQueryClient();
  return useMutation<Dog, Error, { id: string; input: UpdateDogInput }>({
    mutationFn: async ({ id, input }) => {
      const data = await graphqlClient.request<UpdateDogResponse>(UPDATE_DOG_MUTATION, {
        id,
        input,
      });
      return data.updateDog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meKeys.all });
      queryClient.invalidateQueries({ queryKey: dogKeys.all });
    },
  });
}

export function useDeleteDog() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      const data = await graphqlClient.request<DeleteDogResponse>(DELETE_DOG_MUTATION, { id });
      return data.deleteDog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meKeys.all });
      queryClient.invalidateQueries({ queryKey: dogKeys.all });
    },
  });
}

export function useGeneratePhotoUploadUrl() {
  return useMutation<PresignedUrl, Error, string>({
    mutationFn: async (dogId) => {
      const data = await graphqlClient.request<GenerateDogPhotoUploadUrlResponse>(
        GENERATE_DOG_PHOTO_UPLOAD_URL_MUTATION,
        { dogId },
      );
      return data.generateDogPhotoUploadUrl;
    },
  });
}
