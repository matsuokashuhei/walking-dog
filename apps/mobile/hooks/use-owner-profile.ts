import { useQuery } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { OWNER_PROFILE_QUERY } from '@/lib/graphql/queries/owner-profile';
import { meKeys } from '@/lib/graphql/keys';
import { mapApiUser } from '@/lib/graphql/adapters';
import { useIsAuthenticated } from './use-is-authenticated';
import type { OwnerProfileResponse, User } from '@/types/graphql';

export interface OwnerProfileWalkSummary {
  id: string;
  startedAt: string;
  distanceM: number;
}

export interface OwnerProfileData {
  user: User;
  totalWalks: number;
  totalDistanceM: number;
  totalDurationSec: number;
  recentWalks: OwnerProfileWalkSummary[];
}

export function mapOwnerProfileResponse(response: OwnerProfileResponse): OwnerProfileData {
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

// Owner profile はユーザー情報と散歩集計を同じ GraphQL query で取得します。
export function useOwnerProfile(limit = 100) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery<OwnerProfileData>({
    queryKey: [...meKeys.all, 'owner-profile', limit],
    queryFn: async () => {
      const data = await authenticatedRequest<OwnerProfileResponse>(
        OWNER_PROFILE_QUERY,
        { first: limit },
      );
      return mapOwnerProfileResponse(data);
    },
    enabled: isAuthenticated,
  });
}
