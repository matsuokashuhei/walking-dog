import { useMutation } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import {
  CREATE_DOG_MUTATION,
  UPDATE_DOG_MUTATION,
  DELETE_DOG_MUTATION,
  GENERATE_DOG_PHOTO_UPLOAD_URL_MUTATION,
} from '@/lib/graphql/mutations/dog';
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

// 犬の作成後、ユーザー関連キャッシュを更新して一覧へ反映します。
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

// 犬のプロフィール更新後、詳細と一覧で使うユーザー関連キャッシュを更新します。
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

// 犬の削除後、所属犬一覧が変わるためユーザー関連キャッシュを更新します。
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

// 犬プロフィール写真を直接アップロードするための署名付き URL を発行します。
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
