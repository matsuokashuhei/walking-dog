import { registerWebModule, NativeModule } from 'expo';
import type { WatchWalkSnapshotPublishResult } from './WalkingDogWatchBridgeModule';

class WalkingDogWatchBridgeModule extends NativeModule<Record<string, never>> {
  async publishWalkSnapshot(_snapshotJson: string): Promise<WatchWalkSnapshotPublishResult> {
    return {
      storedInAppGroup: false,
      watchConnectivitySupported: false,
      paired: false,
      watchAppInstalled: false,
      activationState: 'unsupported',
      reachable: false,
      activationRequested: false,
      applicationContextUpdated: false,
      immediateMessageAttempted: false,
      failureReason: 'watch_connectivity_unsupported',
    };
  }

  async getPendingCommands(): Promise<string[]> {
    return [];
  }

  async ackCommand(_commandId: string): Promise<void> {}
}

export default registerWebModule(WalkingDogWatchBridgeModule, 'WalkingDogWatchBridge');
