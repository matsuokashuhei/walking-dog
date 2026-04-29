import { useMutation } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import {
  GENERATE_DOG_INVITATION_MUTATION,
  REMOVE_DOG_MEMBER_MUTATION,
  LEAVE_DOG_MUTATION,
} from '@/lib/graphql/mutations/dog';
import { useInvalidateUserQueries } from './use-invalidate-user-queries';
import type {
  DogInvitation,
  GenerateDogInvitationResponse,
  RemoveDogMemberResponse,
  LeaveDogResponse,
} from '@/types/graphql';

// 犬へメンバーを招待するためのトークンを発行します。
export function useGenerateInvitation() {
  return useMutation<DogInvitation, Error, string>({
    mutationFn: async (dogId) => {
      const data = await authenticatedRequest<GenerateDogInvitationResponse>(
        GENERATE_DOG_INVITATION_MUTATION,
        { dogId },
      );
      return data.generateDogInvitation;
    },
  });
}

// メンバー削除後は所属情報が変わるため、ユーザー関連キャッシュを更新します。
export function useRemoveMember() {
  const invalidateUserQueries = useInvalidateUserQueries();
  return useMutation<boolean, Error, { dogId: string; userId: string }>({
    mutationFn: async ({ dogId, userId }) => {
      const data = await authenticatedRequest<RemoveDogMemberResponse>(
        REMOVE_DOG_MEMBER_MUTATION,
        { dogId, userId },
      );
      return data.removeDogMember;
    },
    onSuccess: invalidateUserQueries,
  });
}

// 現在ユーザーが犬から抜けた後、所属犬一覧を最新化します。
export function useLeaveDog() {
  const invalidateUserQueries = useInvalidateUserQueries();
  return useMutation<boolean, Error, string>({
    mutationFn: async (dogId) => {
      const data = await authenticatedRequest<LeaveDogResponse>(
        LEAVE_DOG_MUTATION,
        { dogId },
      );
      return data.leaveDog;
    },
    onSuccess: invalidateUserQueries,
  });
}
