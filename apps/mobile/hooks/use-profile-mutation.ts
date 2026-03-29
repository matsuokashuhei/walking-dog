import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { UPDATE_PROFILE_MUTATION } from '@/lib/graphql/mutations';
import { meKeys } from '@/lib/graphql/keys';
import type { UpdateProfileInput, UpdateProfileResponse, User } from '@/types/graphql';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<User, Error, UpdateProfileInput>({
    mutationFn: async (input) => {
      const data = await authenticatedRequest<UpdateProfileResponse>(
        UPDATE_PROFILE_MUTATION,
        { input },
      );
      return data.updateProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}
