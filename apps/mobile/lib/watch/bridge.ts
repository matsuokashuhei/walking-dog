import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';
import type { WatchWalkCommand, WatchWalkSnapshot } from './types';

type WatchBridgeEvents = {
  onWatchWalkCommand(event: { commandJson: string }): void;
};

export type WatchWalkSnapshotPublishResult = {
  storedInAppGroup: boolean;
  watchConnectivitySupported: boolean;
  paired: boolean;
  watchAppInstalled: boolean;
  activationState: 'unsupported' | 'notActivated' | 'inactive' | 'activated' | 'unknown';
  reachable: boolean;
  activationRequested: boolean;
  applicationContextUpdated: boolean;
  immediateMessageAttempted: boolean;
  failureReason?: string;
  errorDescription?: string;
};

type WalkingDogWatchBridgeModule = {
  publishWalkSnapshot(snapshotJson: string): Promise<WatchWalkSnapshotPublishResult>;
  getPendingCommands(): Promise<string[]>;
  ackCommand(commandId: string): Promise<void>;
  addListener<EventName extends keyof WatchBridgeEvents>(
    eventName: EventName,
    listener: WatchBridgeEvents[EventName],
  ): EventSubscription;
};

function getNativeModule(): WalkingDogWatchBridgeModule | null {
  return requireOptionalNativeModule<WalkingDogWatchBridgeModule>('WalkingDogWatchBridge');
}

export async function publishWalkSnapshot(
  snapshot: WatchWalkSnapshot,
): Promise<WatchWalkSnapshotPublishResult | null> {
  return (await getNativeModule()?.publishWalkSnapshot(JSON.stringify(snapshot))) ?? null;
}

export async function getPendingCommands(): Promise<WatchWalkCommand[]> {
  const commandJson = (await getNativeModule()?.getPendingCommands()) ?? [];
  return commandJson.map((raw) => JSON.parse(raw) as WatchWalkCommand);
}

export async function ackCommand(commandId: string): Promise<void> {
  await getNativeModule()?.ackCommand(commandId);
}

export function addCommandListener(
  listener: (command: WatchWalkCommand) => void,
): EventSubscription {
  return (
    getNativeModule()?.addListener('onWatchWalkCommand', (event) => {
      listener(JSON.parse(event.commandJson) as WatchWalkCommand);
    }) ?? {
      remove() {},
    }
  );
}
