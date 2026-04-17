import { useMutation } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import {
  CREATE_DOG_MUTATION,
  UPDATE_DOG_MUTATION,
  DELETE_DOG_MUTATION,
  GENERATE_DOG_PHOTO_UPLOAD_URL_MUTATION,
} from '@/lib/graphql/mutations';
import { useInvalidateUserQueries } from './use-invalidate-user-queries';
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
  const invalidateUserQueries = useInvalidateUserQueries();
  return useMutation<Dog, Error, CreateDogInput>({
    mutationFn: async (input) => {
      const data = await authenticatedRequest<CreateDogResponse>(CREATE_DOG_MUTATION, { input });
      return data.createDog;
    },
    onSuccess: invalidateUserQueries,
  });
}

export function useUpdateDog() {
  const invalidateUserQueries = useInvalidateUserQueries();
  return useMutation<Dog, Error, { id: string; input: UpdateDogInput }>({
    mutationFn: async ({ id, input }) => {
      const data = await authenticatedRequest<UpdateDogResponse>(UPDATE_DOG_MUTATION, {
        id,
        input,
      });
      return data.updateDog;
    },
    onSuccess: invalidateUserQueries,
  });
}

export function useDeleteDog() {
  const invalidateUserQueries = useInvalidateUserQueries();
  return useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      const data = await authenticatedRequest<DeleteDogResponse>(DELETE_DOG_MUTATION, { id });
      return data.deleteDog;
    },
    onSuccess: invalidateUserQueries,
  });
}

export function useGeneratePhotoUploadUrl() {
  return useMutation<PresignedUrl, Error, { dogId: string; contentType: string }>({
    mutationFn: async ({ dogId, contentType }) => {
      const data = await authenticatedRequest<GenerateDogPhotoUploadUrlResponse>(
        GENERATE_DOG_PHOTO_UPLOAD_URL_MUTATION,
        { dogId, contentType },
      );
      return data.generateDogPhotoUploadUrl;
    },
  });
}
