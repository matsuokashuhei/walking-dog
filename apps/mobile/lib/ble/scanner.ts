/**
 * BLE scanner and advertiser for Walking Dog encounter detection.
 *
 * Scanning: Uses react-native-ble-plx (Central mode) to discover nearby
 * Walking Dog users by filtering on WALKING_DOG_SERVICE_UUID.
 *
 * Advertising: Uses the custom ble-advertiser Expo Module (Peripheral mode)
 * to broadcast our walk ID as a service UUID.
 *
 * Walk ID transmission strategy:
 * Both iOS and Android advertise 2 service UUIDs:
 *   1. WALKING_DOG_SERVICE_UUID — fixed, used for scan filtering
 *   2. Walk ID UUID — the actual walk ID for encounter matching
 *
 * This avoids the iOS limitation where CBPeripheralManager cannot include
 * manufacturer data in advertisements.
 */

import { WALKING_DOG_SERVICE_UUID } from './constants';

// Lazy import BLE scanner to avoid crash when library is not installed.
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

// Lazy import BLE advertiser to avoid crash when native module is not built.
function getBleAdvertiser(): { startAdvertising: any; stopAdvertising: any } | null {
  try {
    return require('../../modules/ble-advertiser');
  } catch {
    console.warn('[BLE] ble-advertiser module not available');
    return null;
  }
}

export interface BleScanner {
  stop: () => void;
}

/**
 * Start scanning for nearby Walking Dog users.
 * Extracts walk ID from advertised service UUIDs.
 * Returns a stop function, or null if BLE is not available.
 */
export async function startScanning(
  onWalkIdDetected: (walkId: string) => void,
): Promise<BleScanner | null> {
  const manager = await getBleManager();
  if (!manager) return null;

  const state = await manager.state();
  if (state !== 'PoweredOn') {
    console.warn(`[BLE] Bluetooth state is ${state}, cannot scan`);
    return null;
  }

  const serviceUuidUpper = WALKING_DOG_SERVICE_UUID.toUpperCase();

  manager.startDeviceScan(
    [WALKING_DOG_SERVICE_UUID],
    { allowDuplicates: true },
    (error: any, device: any) => {
      if (error) {
        console.warn('[BLE] Scan error:', error.message);
        return;
      }
      if (!device?.serviceUUIDs || device.serviceUUIDs.length < 2) return;

      // Extract Walk ID: find the service UUID that is NOT our fixed filter UUID
      const walkId = device.serviceUUIDs.find(
        (uuid: string) => uuid.toUpperCase() !== serviceUuidUpper,
      );
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
 * Uses the ble-advertiser Expo Module for Peripheral mode.
 */
export async function startAdvertising(
  walkId: string,
): Promise<{ stop: () => void } | null> {
  const advertiser = getBleAdvertiser();
  if (!advertiser) {
    console.warn('[BLE] Advertising not available (native module not built)');
    return null;
  }

  try {
    await advertiser.startAdvertising(WALKING_DOG_SERVICE_UUID, walkId);
    return {
      stop: () => {
        advertiser.stopAdvertising().catch((err: any) =>
          console.warn('[BLE] Stop advertising error:', err),
        );
      },
    };
  } catch (error) {
    console.warn('[BLE] Failed to start advertising:', error);
    return null;
  }
}

/** Destroy the BLE manager (call on app unmount). */
export function destroyBleManager(): void {
  if (bleManagerInstance) {
    bleManagerInstance.destroy();
    bleManagerInstance = null;
  }
}
