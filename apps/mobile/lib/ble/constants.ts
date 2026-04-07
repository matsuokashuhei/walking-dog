/**
 * BLE constants for Walking Dog encounter detection.
 *
 * The app uses a custom BLE service UUID to identify other Walking Dog users.
 * The walk ID is encoded in manufacturer data so the API can match dog pairs.
 */

// Custom 128-bit service UUID for Walking Dog BLE encounter detection.
// Used to filter scan results to only our app's devices.
export const WALKING_DOG_SERVICE_UUID = 'WD000001-0000-1000-8000-00805F9B34FB';

// Manufacturer data company ID (0xFFFF = reserved for testing/development).
export const COMPANY_ID = 0xffff;

// Protocol version byte.
export const PROTOCOL_VERSION = 0x01;

// BLE encounter detection thresholds.
export const ENCOUNTER_THRESHOLD_MS = 30_000; // 30 seconds continuous detection
export const STALE_TIMEOUT_MS = 60_000; // 60 seconds without signal → discard
export const CLEANUP_INTERVAL_MS = 10_000; // 10 seconds between cleanup runs
