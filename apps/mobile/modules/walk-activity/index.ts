import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface WalkActivityStartInput {
  walkId: string;
  dogName: string;
  startedAtMs: number;
  distanceM: number;
}

export interface WalkActivityUpdateInput {
  distanceM: number;
  lastEventKind?: string;
  lastEventAtMs?: number;
}

interface WalkActivityModuleType {
  isSupported(): boolean;
  startActivity(input: WalkActivityStartInput): Promise<string>;
  updateActivity(activityId: string, input: WalkActivityUpdateInput): Promise<void>;
  endActivity(activityId: string): Promise<void>;
}

const nativeModule =
  Platform.OS === 'ios' ? requireNativeModule<WalkActivityModuleType>('WalkActivity') : null;

export function isSupported(): boolean {
  if (!nativeModule) return false;
  return nativeModule.isSupported();
}

export async function startActivity(input: WalkActivityStartInput): Promise<string | null> {
  if (!nativeModule || !nativeModule.isSupported()) return null;
  return nativeModule.startActivity(input);
}

export async function updateActivity(
  activityId: string,
  input: WalkActivityUpdateInput,
): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.updateActivity(activityId, input);
}

export async function endActivity(activityId: string): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.endActivity(activityId);
}
