import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { ACCEPT_DOG_INVITATION_MUTATION } from '@/lib/graphql/mutations';
import { meKeys, dogKeys } from '@/lib/graphql/keys';
import type { Dog, AcceptDogInvitationResponse } from '@/types/graphql';

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation<Dog, Error, string>({
    mutationFn: async (token) => {
      const data = await authenticatedRequest<AcceptDogInvitationResponse>(
        ACCEPT_DOG_INVITATION_MUTATION,
        { token },
      );
      return data.acceptDogInvitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meKeys.all });
      queryClient.invalidateQueries({ queryKey: dogKeys.all });
    },
  });
}
