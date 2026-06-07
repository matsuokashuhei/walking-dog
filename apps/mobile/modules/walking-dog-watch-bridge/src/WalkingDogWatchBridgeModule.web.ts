import { registerWebModule, NativeModule } from 'expo';

class WalkingDogWatchBridgeModule extends NativeModule<Record<string, never>> {
  async publishWalkSnapshot(_snapshotJson: string): Promise<void> {}

  async getPendingCommands(): Promise<string[]> {
    return [];
  }

  async ackCommand(_commandId: string): Promise<void> {}
}

export default registerWebModule(WalkingDogWatchBridgeModule, 'WalkingDogWatchBridge');
