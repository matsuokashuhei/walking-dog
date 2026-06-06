import { useQuery } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { USER_PROFILE_QUERY } from '@/lib/graphql/queries/user-profile';
import { meKeys } from '@/lib/graphql/keys';
import { mapApiUser } from '@/lib/graphql/adapters';
import { useIsAuthenticated } from './use-is-authenticated';
import type { UserProfileResponse, User } from '@/types/graphql';

export interface UserProfileWalkSummary {
  id: string;
  startedAt: string;
  distanceM: number;
}

export interface UserProfileData {
  user: User;
  totalWalks: number;
  totalDistanceM: number;
  totalDurationSec: number;
  recentWalks: UserProfileWalkSummary[];
}

export function mapUserProfileResponse(response: UserProfileResponse): UserProfileData {
  return {
    user: mapApiUser(response.user),
    totalWalks: response.user.walks.totalCount,
    totalDistanceM: response.user.walks.totalDistance,
    totalDurationSec: response.user.walks.totalDuration,
    recentWalks: response.user.walks.nodes.map((walk) => ({
      id: walk.id,
      startedAt: walk.startedAt,
      distanceM: walk.distance ?? 0,
    })),
  };
}

// User profile はユーザー情報と散歩集計を同じ GraphQL query で取得します。
export function useUserProfile(limit = 100) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery<UserProfileData>({
    queryKey: [...meKeys.all, 'user-profile', limit],
    queryFn: async () => {
      const data = await authenticatedRequest<UserProfileResponse>(
        USER_PROFILE_QUERY,
        { first: limit },
      );
      return mapUserProfileResponse(data);
    },
    enabled: isAuthenticated,
  });
}
