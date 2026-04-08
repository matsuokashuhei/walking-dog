/**
 * BLE permission handling for iOS and Android.
 *
 * iOS: Bluetooth permission is prompted automatically when BleManager starts.
 * Android: Requires explicit permission requests for BLUETOOTH_SCAN, ADVERTISE, CONNECT.
 */

import { Platform, PermissionsAndroid } from 'react-native';

export async function requestBluetoothPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // iOS prompts automatically when BLE is first used.
    // We return true here and handle the actual state check in the scanner.
    return true;
  }

  if (Platform.OS === 'android') {
    // Android 12+ requires these runtime permissions for BLE.
    if (Platform.Version >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        'android.permission.BLUETOOTH_SCAN' as PermissionsAndroid.Permission,
        'android.permission.BLUETOOTH_ADVERTISE' as PermissionsAndroid.Permission,
        'android.permission.BLUETOOTH_CONNECT' as PermissionsAndroid.Permission,
      ]);
      return Object.values(result).every(
        (status) => status === PermissionsAndroid.RESULTS.GRANTED,
      );
    }
    // Android < 12: BLE permissions are granted via manifest.
    return true;
  }

  return false;
}
