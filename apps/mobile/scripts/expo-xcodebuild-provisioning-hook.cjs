const childProcess = require('node:child_process');
const path = require('node:path');

const REQUIRED_PROVISIONING_FLAGS = [
  '-allowProvisioningUpdates',
  '-allowProvisioningDeviceRegistration',
];

function isXcodebuildCommand(command) {
  return typeof command === 'string' && path.basename(command) === 'xcodebuild';
}

function withRequiredProvisioningFlags(command, args) {
  if (!isXcodebuildCommand(command) || !Array.isArray(args)) {
    return args;
  }

  const missingFlags = REQUIRED_PROVISIONING_FLAGS.filter((flag) => !args.includes(flag));
  if (missingFlags.length === 0) {
    return args;
  }

  return [...args, ...missingFlags];
}

function patchSpawnForProvisioningUpdates() {
  if (childProcess.spawn.__walkingDogProvisioningHookPatched) {
    return;
  }

  const originalSpawn = childProcess.spawn;

  // Expo CLI skips these flags when every target already has DEVELOPMENT_TEAM.
  // Watch targets still need xcodebuild to create missing profiles on first device builds.
  function spawnWithProvisioningFlags(command, args, options) {
    return originalSpawn.call(
      this,
      command,
      withRequiredProvisioningFlags(command, args),
      options,
    );
  }

  Object.defineProperty(spawnWithProvisioningFlags, '__walkingDogProvisioningHookPatched', {
    value: true,
  });

  childProcess.spawn = spawnWithProvisioningFlags;
}

if (process.env.NODE_ENV !== 'test') {
  patchSpawnForProvisioningUpdates();
}

module.exports = {
  REQUIRED_PROVISIONING_FLAGS,
  patchSpawnForProvisioningUpdates,
  withRequiredProvisioningFlags,
};
