/**
 * BLE scanner and advertiser for Walking Dog encounter detection.
 *
 * Uses react-native-ble-plx for BLE Central mode (scanning).
 * Walk ID is encoded in manufacturer data of the BLE advertisement.
 *
 * NOTE: This module requires react-native-ble-plx to be installed.
 * It will gracefully fail if BLE is not available (e.g., in simulator).
 */

import { WALKING_DOG_SERVICE_UUID, COMPANY_ID, PROTOCOL_VERSION } from './constants';

// Lazy import to avoid crash when react-native-ble-plx is not installed.
// This allows the rest of the app to work without BLE.
let BleManager: any = null;
let bleManagerInstance: any = null;

async function getBleManager(): Promise<any> {
  if (bleManagerInstance) return bleManagerInstance;
  try {
    const mod = require('react-native-ble-plx');
    BleManager = mod.BleManager;
    bleManagerInstance = new BleManager();
    return bleManagerInstance;
  } catch {
    console.warn('[BLE] react-native-ble-plx not available');
    return null;
  }
}

/** Encode a walk ID (UUID string) into manufacturer data bytes. */
export function encodeWalkId(walkId: string): number[] {
  // Remove hyphens from UUID and convert to byte array
  const hex = walkId.replace(/-/g, '');
  const bytes: number[] = [
    COMPANY_ID & 0xff,
    (COMPANY_ID >> 8) & 0xff,
    PROTOCOL_VERSION,
  ];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return bytes;
}

/** Decode a walk ID from manufacturer data bytes. Returns null if invalid. */
export function decodeWalkId(manufacturerData: string): string | null {
  try {
    // manufacturerData is base64 encoded
    const raw = atob(manufacturerData);
    if (raw.length < 19) return null; // 2 (company) + 1 (version) + 16 (UUID)

    const version = raw.charCodeAt(2);
    if (version !== PROTOCOL_VERSION) return null;

    const hexParts: string[] = [];
    for (let i = 3; i < 19; i++) {
      hexParts.push(raw.charCodeAt(i).toString(16).padStart(2, '0'));
    }
    const hex = hexParts.join('');
    // Format as UUID: 8-4-4-4-12
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  } catch {
    return null;
  }
}

export interface BleScanner {
  stop: () => void;
}

/**
 * Start scanning for nearby Walking Dog users.
 * Returns a stop function, or null if BLE is not available.
 */
export async function startScanning(
  onWalkIdDetected: (walkId: string) => void,
): Promise<BleScanner | null> {
  const manager = await getBleManager();
  if (!manager) return null;

  // Wait for BLE to be powered on
  const state = await manager.state();
  if (state !== 'PoweredOn') {
    console.warn(`[BLE] Bluetooth state is ${state}, cannot scan`);
    return null;
  }

  manager.startDeviceScan(
    [WALKING_DOG_SERVICE_UUID],
    { allowDuplicates: true },
    (error: any, device: any) => {
      if (error) {
        console.warn('[BLE] Scan error:', error.message);
        return;
      }
      if (!device?.manufacturerData) return;

      const walkId = decodeWalkId(device.manufacturerData);
      if (walkId) {
        onWalkIdDetected(walkId);
      }
    },
  );

  return {
    stop: () => {
      manager.stopDeviceScan();
    },
  };
}

/**
 * Start advertising our walk ID to nearby devices.
 * Returns a stop function, or null if advertising is not available.
 *
 * NOTE: react-native-ble-plx does not natively support BLE Peripheral mode.
 * This is a placeholder that will need a native module or react-native-ble-advertiser.
 * For now, we log a warning and return a no-op stop function.
 */
export async function startAdvertising(
  _walkId: string,
): Promise<{ stop: () => void } | null> {
  console.warn(
    '[BLE] Advertising not yet implemented. Will need react-native-ble-advertiser or custom Expo Module.',
  );
  // TODO: Implement BLE Peripheral mode advertising
  return { stop: () => {} };
}

/** Destroy the BLE manager (call on app unmount). */
export function destroyBleManager(): void {
  if (bleManagerInstance) {
    bleManagerInstance.destroy();
    bleManagerInstance = null;
  }
}
