import { useCallback } from 'react';
import { requestPermission } from '@/lib/walk/gps-tracker';
import { requestBluetoothPermission } from '@/lib/ble/permissions';

export function useWalkPermissions() {
  const requestGpsPermission = useCallback(() => requestPermission(), []);
  const requestBlePermission = useCallback(() => requestBluetoothPermission(), []);
  return { requestGpsPermission, requestBlePermission };
}
