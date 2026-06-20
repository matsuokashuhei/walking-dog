import { Platform, type KeyboardTypeOptions } from 'react-native';

export const emailKeyboardType =
  Platform.select<KeyboardTypeOptions>({
    ios: 'ascii-capable',
    default: 'email-address',
  }) ?? 'email-address';
