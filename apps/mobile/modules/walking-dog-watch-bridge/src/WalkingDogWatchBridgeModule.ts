import { NativeModule, requireNativeModule } from 'expo';

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

declare class WalkingDogWatchBridgeModule extends NativeModule<WatchBridgeEvents> {
  publishWalkSnapshot(snapshotJson: string): Promise<WatchWalkSnapshotPublishResult>;
  getPendingCommands(): Promise<string[]>;
  ackCommand(commandId: string): Promise<void>;
}

export default requireNativeModule<WalkingDogWatchBridgeModule>('WalkingDogWatchBridge');
