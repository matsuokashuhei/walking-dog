import { useMutation } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { ACCEPT_DOG_INVITATION_MUTATION } from '@/lib/graphql/mutations/dog';
import { useInvalidateUserQueries } from './use-invalidate-user-queries';
import type { Dog, AcceptDogInvitationResponse } from '@/types/graphql';

export function useAcceptInvitation() {
  const invalidateUserQueries = useInvalidateUserQueries();
  return useMutation<Dog, Error, string>({
    mutationFn: async (token) => {
      const data = await authenticatedRequest<AcceptDogInvitationResponse>(
        ACCEPT_DOG_INVITATION_MUTATION,
        { token },
      );
      return data.acceptDogInvitation;
    },
    onSuccess: invalidateUserQueries,
  });
}
