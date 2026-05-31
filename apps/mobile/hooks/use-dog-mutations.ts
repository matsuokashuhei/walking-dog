import { useMutation } from '@tanstack/react-query';
import {
  authenticatedMultipartRequest,
  authenticatedRequest,
  type UploadFile,
} from '@/lib/graphql/client';
import {
  ADD_DOG_MUTATION,
  UPDATE_DOG_MUTATION,
  REMOVE_DOG_MUTATION,
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

type UpdateDogMutationInput = UpdateDogInput & {
  avatarFile?: UploadFile;
};

type UpdateDogMutationVariables = {
  id: string;
  input: UpdateDogMutationInput;
};

function toUpdateDogRequestInput(
  id: string,
  input: UpdateDogMutationInput,
): {
  id: string;
  name: string | undefined;
  breed: string | undefined;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | undefined;
  birthday: UpdateDogInput['birthday'];
  dailyGoalMinutes?: number;
  walkGoal?: UpdateDogInput['walkGoal'];
} {
  const requestInput: {
    id: string;
    name: string | undefined;
    breed: string | undefined;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | undefined;
    birthday: UpdateDogInput['birthday'];
    dailyGoalMinutes?: number;
    walkGoal?: UpdateDogInput['walkGoal'];
  } = {
    id,
    name: input.name,
    breed: input.breed,
    gender: input.gender ? toApiGender(input.gender) : undefined,
    birthday: input.birthday,
  };
  if (input.walkGoal !== undefined) requestInput.walkGoal = input.walkGoal;
  if (input.dailyGoalMinutes !== undefined) {
    requestInput.dailyGoalMinutes = input.dailyGoalMinutes;
  }
  return requestInput;
}

// 犬の作成後、ユーザー関連キャッシュを更新して一覧へ反映します。
export function useCreateDog() {
  const invalidateUserQueries = useInvalidateUserQueries();
  return useMutation<Dog, Error, CreateDogInput>({
    mutationFn: async (input) => {
      const data = await authenticatedRequest<CreateDogResponse>(ADD_DOG_MUTATION, {
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
  return useMutation<Dog, Error, UpdateDogMutationVariables>({
    mutationFn: async ({ id, input }) => {
      const requestInput = toUpdateDogRequestInput(id, input);
      const data = input.avatarFile
        ? await authenticatedMultipartRequest<UpdateDogResponse>(
            UPDATE_DOG_MUTATION,
            {
              input: {
                ...requestInput,
                avatar: null,
              },
            },
            { 'variables.input.avatar': input.avatarFile },
          )
        : await authenticatedRequest<UpdateDogResponse>(UPDATE_DOG_MUTATION, {
            input: requestInput,
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
      const data = await authenticatedRequest<DeleteDogResponse>(REMOVE_DOG_MUTATION, {
        input: { id },
      });
      return mapApiDog(data.removeDog);
    },
    onSuccess: invalidateUserQueries,
  });
}
