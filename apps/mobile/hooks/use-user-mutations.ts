import { useMutation } from '@tanstack/react-query';
import {
  authenticatedMultipartRequest,
  authenticatedRequest,
  type UploadFile,
} from '@/lib/graphql/client';
import { UPDATE_USER_MUTATION } from '@/lib/graphql/mutations/user';
import { mapApiUser } from '@/lib/graphql/adapters';
import { useInvalidateUserQueries } from './use-invalidate-user-queries';
import type { UpdateUserInput, UpdateUserResponse, User } from '@/types/graphql';

type UpdateUserMutationInput = UpdateUserInput & {
  avatarFile?: UploadFile;
};

type UpdateUserMutationVariables = {
  input: UpdateUserMutationInput;
};

function toUpdateUserRequestInput(input: UpdateUserMutationInput): UpdateUserInput {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
  };
}

// 飼い主プロフィール更新後、Settings/Profile が参照するユーザー関連キャッシュを更新します。
export function useUpdateUser() {
  const invalidateUserQueries = useInvalidateUserQueries();
  return useMutation<User, Error, UpdateUserMutationVariables>({
    mutationFn: async ({ input }) => {
      const requestInput = toUpdateUserRequestInput(input);
      const data = input.avatarFile
        ? await authenticatedMultipartRequest<UpdateUserResponse>(
            UPDATE_USER_MUTATION,
            {
              input: {
                ...requestInput,
                avatar: null,
              },
            },
            { 'variables.input.avatar': input.avatarFile },
          )
        : await authenticatedRequest<UpdateUserResponse>(UPDATE_USER_MUTATION, {
            input: requestInput,
          });
      return mapApiUser(data.updateUser);
    },
    onSuccess: invalidateUserQueries,
  });
}
