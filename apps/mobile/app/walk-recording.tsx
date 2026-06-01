import { useEffect, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useActiveWalkSnapshotSync } from '@/hooks/use-active-walk-snapshot-sync';

// 旧 deep link / Live Activity URL 互換用 route。記録 UI は Walk タブ内の永続 shell が所有します。
export default function WalkRecordingScreen() {
  const params = useLocalSearchParams<{ action?: string; walkId?: string }>();
  const routeWalkId = typeof params.walkId === 'string' ? params.walkId : undefined;
  const action = params.action === 'camera' ? 'camera' : undefined;

  useActiveWalkSnapshotSync(routeWalkId);

  const nextParams = useMemo(() => {
    const entries: { action?: string; walkId?: string } = {};
    if (action) entries.action = action;
    if (routeWalkId) entries.walkId = routeWalkId;
    return Object.keys(entries).length > 0 ? entries : undefined;
  }, [action, routeWalkId]);

  useEffect(() => {
    router.replace({
      pathname: '/(tabs)/walk',
      params: nextParams,
    });
  }, [nextParams]);

  return null;
}
