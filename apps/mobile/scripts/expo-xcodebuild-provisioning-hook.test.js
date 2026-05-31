const {
  REQUIRED_PROVISIONING_FLAGS,
  withRequiredProvisioningFlags,
} = require('./expo-xcodebuild-provisioning-hook.cjs');

describe('withRequiredProvisioningFlags', () => {
  it('adds provisioning update flags to Expo xcodebuild args without mutating them', () => {
    const expoArgs = [
      '-workspace',
      '/Users/matsuokashuhei/Development/walking-dog/apps/mobile/ios/WalkingDog.xcworkspace',
      '-configuration',
      'Release',
      '-scheme',
      'WalkingDog',
      '-destination',
      'id=00008120-001A2DE83A3B401E',
      'COCOAPODS_PARALLEL_CODE_SIGN=true',
      'COMPILER_INDEX_STORE_ENABLE=NO',
    ];

    const updated = withRequiredProvisioningFlags('xcodebuild', expoArgs);

    expect(updated).toEqual([...expoArgs, ...REQUIRED_PROVISIONING_FLAGS]);
    expect(expoArgs).not.toContain('-allowProvisioningUpdates');
    expect(expoArgs).not.toContain('-allowProvisioningDeviceRegistration');
  });

  it('does not duplicate provisioning flags that are already present', () => {
    const expoArgs = [
      '-workspace',
      'ios/WalkingDog.xcworkspace',
      '-allowProvisioningUpdates',
      '-allowProvisioningDeviceRegistration',
    ];

    expect(withRequiredProvisioningFlags('xcodebuild', expoArgs)).toBe(expoArgs);
  });

  it('leaves non-xcodebuild commands unchanged', () => {
    const args = ['run:ios', '--device'];

    expect(withRequiredProvisioningFlags('node', args)).toBe(args);
  });
});
