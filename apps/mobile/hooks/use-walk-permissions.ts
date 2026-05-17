import { useCallback } from 'react';
import { requestPermission } from '@/lib/walk/gps-tracker';

// 散歩開始時に必要な GPS 権限要求を画面から呼びやすい形で提供します。
export function useWalkPermissions() {
  const requestGpsPermission = useCallback(() => requestPermission(), []);
  return { requestGpsPermission };
}
