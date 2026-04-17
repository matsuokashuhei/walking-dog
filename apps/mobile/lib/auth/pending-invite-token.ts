import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const PENDING_INVITE_KEY = 'pending_invite_token';

export async function savePendingInviteToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PENDING_INVITE_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(PENDING_INVITE_KEY, token);
}

export async function getPendingInviteToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(PENDING_INVITE_KEY)
      : null;
  }
  return SecureStore.getItemAsync(PENDING_INVITE_KEY);
}

export async function deletePendingInviteToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(PENDING_INVITE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PENDING_INVITE_KEY);
}
