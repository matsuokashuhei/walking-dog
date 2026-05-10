import { useMutation } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import {
  CREATE_DOG_MUTATION,
  UPDATE_DOG_MUTATION,
  DELETE_DOG_MUTATION,
} from '@/lib/graphql/mutations/dog';
import { mapApiDog } from '@/lib/graphql/adapters';
import { useInvalidateUserQueries } from './use-invalidate-user-queries';
import type {
  CreateDogInput,
  UpdateDogInput,
  Dog,
  CreateDogResponse,
  UpdateDogResponse,
  DeleteDogResponse,
} from '@/types/graphql';

function toApiGender(gender: string | undefined): 'MALE' | 'FEMALE' | 'OTHER' {
  const normalized = gender?.trim().toUpperCase();
  if (normalized === 'MALE' || normalized === 'FEMALE' || normalized === 'OTHER') {
    return normalized;
  }
  return 'OTHER';
}

// 犬の作成後、ユーザー関連キャッシュを更新して一覧へ反映します。
export function useCreateDog() {
  const invalidateUserQueries = useInvalidateUserQueries();
  return useMutation<Dog, Error, CreateDogInput>({
    mutationFn: async (input) => {
      const data = await authenticatedRequest<CreateDogResponse>(CREATE_DOG_MUTATION, {
        input: {
          name: input.name,
          breed: input.breed,
          gender: toApiGender(input.gender),
          birthday: input.birthday,
        },
      });
      return mapApiDog(data.addDog);
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
        input: {
          id,
          name: input.name,
          breed: input.breed,
          gender: input.gender ? toApiGender(input.gender) : undefined,
          birthday: input.birthday,
        },
      });
      return mapApiDog(data.updateDog);
    },
    onSuccess: invalidateUserQueries,
  });
}

// 犬の削除後、所属犬一覧が変わるためユーザー関連キャッシュを更新します。
export function useDeleteDog() {
  const invalidateUserQueries = useInvalidateUserQueries();
  return useMutation<Dog, Error, string>({
    mutationFn: async (id) => {
      const data = await authenticatedRequest<DeleteDogResponse>(DELETE_DOG_MUTATION, {
        input: { id },
      });
      return mapApiDog(data.removeDog);
    },
    onSuccess: invalidateUserQueries,
  });
}

// 犬プロフィール写真を直接アップロードするための署名付き URL を発行します。
export function useGeneratePhotoUploadUrl() {
  return useMutation<never, Error, { dogId: string; contentType: string }>({
    mutationFn: async () => {
      throw new Error('Dog photo upload URLs are not supported by the current GraphQL schema.');
    },
  });
}
