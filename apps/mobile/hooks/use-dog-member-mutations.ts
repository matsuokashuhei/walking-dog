import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import {
  GENERATE_DOG_INVITATION_MUTATION,
  REMOVE_DOG_MEMBER_MUTATION,
  LEAVE_DOG_MUTATION,
} from '@/lib/graphql/mutations';
import { meKeys, dogKeys } from '@/lib/graphql/keys';
import type {
  DogInvitation,
  GenerateDogInvitationResponse,
  RemoveDogMemberResponse,
  LeaveDogResponse,
} from '@/types/graphql';

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

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { dogId: string; userId: string }>({
    mutationFn: async ({ dogId, userId }) => {
      const data = await authenticatedRequest<RemoveDogMemberResponse>(
        REMOVE_DOG_MEMBER_MUTATION,
        { dogId, userId },
      );
      return data.removeDogMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dogKeys.all });
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}

export function useLeaveDog() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (dogId) => {
      const data = await authenticatedRequest<LeaveDogResponse>(
        LEAVE_DOG_MUTATION,
        { dogId },
      );
      return data.leaveDog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dogKeys.all });
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}
