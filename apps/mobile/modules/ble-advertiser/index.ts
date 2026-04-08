import { requireNativeModule } from 'expo-modules-core';

interface BleAdvertiserModuleType {
  startAdvertising(serviceUuid: string, walkIdUuid: string): Promise<void>;
  stopAdvertising(): Promise<void>;
  isAdvertising(): boolean;
}

const BleAdvertiserNative =
  requireNativeModule<BleAdvertiserModuleType>('BleAdvertiser');

/**
 * Start BLE advertising with a service UUID and walk ID UUID.
 * Both UUIDs are advertised as service UUIDs in the BLE advertisement.
 * The serviceUuid is used for filtering, walkIdUuid carries the walk ID.
 */
export async function startAdvertising(
  serviceUuid: string,
  walkIdUuid: string,
): Promise<void> {
  return BleAdvertiserNative.startAdvertising(serviceUuid, walkIdUuid);
}

/**
 * Stop BLE advertising.
 */
export async function stopAdvertising(): Promise<void> {
  return BleAdvertiserNative.stopAdvertising();
}

/**
 * Check if currently advertising.
 */
export function isAdvertising(): boolean {
  return BleAdvertiserNative.isAdvertising();
}
