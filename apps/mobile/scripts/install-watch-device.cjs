#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const WATCH_BUNDLE_ID = 'com.walkingdog.app.watch';
const WATCH_SCHEME = 'WalkingDogWatch';
const WATCH_APP_NAME = 'WalkingDogWatch.app';

function parseWatchDeviceIdFromXctrace(output) {
  let inDevicesSection = false;

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed === '== Devices ==') {
      inDevicesSection = true;
      continue;
    }

    if (trimmed.startsWith('== ') && trimmed.endsWith(' ==')) {
      inDevicesSection = false;
      continue;
    }

    if (!inDevicesSection || !/Apple\s+Watch/.test(trimmed)) {
      continue;
    }

    const match = trimmed.match(/\(([0-9A-Fa-f]{8}-[0-9A-Fa-f]{16})\)$/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function getWatchInstallPaths(projectRoot = path.resolve(__dirname, '..')) {
  const derivedDataPath = path.join(projectRoot, 'ios', 'build', 'watch-device-derived-data');

  return {
    derivedDataPath,
    watchAppPath: path.join(
      derivedDataPath,
      'Build',
      'Products',
      'Release-watchos',
      WATCH_APP_NAME,
    ),
    workspacePath: path.join(projectRoot, 'ios', 'WalkingDog.xcworkspace'),
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function getWatchDeviceId() {
  if (process.env.WATCH_DEVICE_ID) {
    return process.env.WATCH_DEVICE_ID;
  }

  const result = spawnSync('xcrun', ['xctrace', 'list', 'devices'], {
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      [
        'Failed to list devices with xcrun xctrace.',
        result.stderr && result.stderr.trim(),
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const watchDeviceId = parseWatchDeviceIdFromXctrace(result.stdout);
  if (!watchDeviceId) {
    throw new Error(
      [
        'No online Apple Watch device was found.',
        'Unlock the Apple Watch, keep it near the iPhone/Mac, then run `xcrun xctrace list devices`.',
      ].join('\n'),
    );
  }

  return watchDeviceId;
}

function installWatchDevice(projectRoot = path.resolve(__dirname, '..')) {
  const watchDeviceId = getWatchDeviceId();
  const { derivedDataPath, watchAppPath, workspacePath } = getWatchInstallPaths(projectRoot);

  run('xcodebuild', [
    '-workspace',
    workspacePath,
    '-scheme',
    WATCH_SCHEME,
    '-configuration',
    'Release',
    '-destination',
    `platform=watchOS,id=${watchDeviceId}`,
    '-derivedDataPath',
    derivedDataPath,
    '-allowProvisioningUpdates',
    '-allowProvisioningDeviceRegistration',
    'build',
  ]);

  run('xcrun', [
    'devicectl',
    'device',
    'install',
    'app',
    '--device',
    watchDeviceId,
    watchAppPath,
  ]);

  run('xcrun', [
    'devicectl',
    'device',
    'info',
    'apps',
    '--device',
    watchDeviceId,
    '--bundle-id',
    WATCH_BUNDLE_ID,
  ]);
}

if (require.main === module) {
  try {
    installWatchDevice();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  getWatchInstallPaths,
  installWatchDevice,
  parseWatchDeviceIdFromXctrace,
};
