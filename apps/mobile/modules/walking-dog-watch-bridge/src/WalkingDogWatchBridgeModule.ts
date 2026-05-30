import { NativeModule, requireNativeModule } from 'expo';

type WatchBridgeEvents = {
  onWatchWalkCommand(event: { commandJson: string }): void;
};

declare class WalkingDogWatchBridgeModule extends NativeModule<WatchBridgeEvents> {
  publishWalkSnapshot(snapshotJson: string): Promise<void>;
  getPendingCommands(): Promise<string[]>;
  ackCommand(commandId: string): Promise<void>;
}

export default requireNativeModule<WalkingDogWatchBridgeModule>('WalkingDogWatchBridge');
