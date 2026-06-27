#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const WATCH_BUNDLE_ID = 'com.walkingdog.app.watch';
const WATCH_SCHEME = 'WalkingDogWatch';
const WATCH_APP_NAME = 'WalkingDogWatch.app';
const WATCH_DEVICE_INSTALL_ATTEMPTS = 3;
const WATCH_DEVICE_INSTALL_RETRY_DELAY_MS = 5000;

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

function parseWatchDeviceIdFromXcodebuildDestinations(output) {
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!/platform\s*:\s*watchOS\s*,/.test(trimmed)) {
      continue;
    }

    const match = trimmed.match(/\bid\s*:\s*([^,}]+)/);
    if (!match) {
      continue;
    }

    const id = match[1].trim();
    if (id && !id.startsWith('dvtdevice-')) {
      return id;
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

function sleepSync(ms) {
  if (ms <= 0) {
    return;
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function buildWatchApp(projectRoot, watchDeviceIdOrOptions, maybeOptions) {
  const options =
    maybeOptions ??
    (typeof watchDeviceIdOrOptions === 'object' && watchDeviceIdOrOptions !== null
      ? watchDeviceIdOrOptions
      : {});
  const runCommand = options.run ?? run;
  const { derivedDataPath, workspacePath } = getWatchInstallPaths(projectRoot);

  runCommand('xcodebuild', [
    '-workspace',
    workspacePath,
    '-scheme',
    WATCH_SCHEME,
    '-configuration',
    'Release',
    '-destination',
    'generic/platform=watchOS',
    '-derivedDataPath',
    derivedDataPath,
    '-allowProvisioningUpdates',
    '-allowProvisioningDeviceRegistration',
    'build',
  ]);
}

function runDevicectlWithRetry(actionLabel, devicectlArgs, options = {}) {
  const maxAttempts = options.maxAttempts ?? WATCH_DEVICE_INSTALL_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? WATCH_DEVICE_INSTALL_RETRY_DELAY_MS;
  const runCommand = options.run ?? run;
  const sleep = options.sleep ?? sleepSync;
  const warn = options.warn ?? console.warn;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      runCommand('xcrun', ['devicectl', ...devicectlArgs]);
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        throw error;
      }

      warn(`${actionLabel} failed on attempt ${attempt}/${maxAttempts}: ${getErrorMessage(error)}`);
      warn(`Retrying ${actionLabel} in ${retryDelayMs}ms...`);
      sleep(retryDelayMs);
    }
  }

  throw lastError;
}

function installBuiltWatchApp(watchDeviceId, watchAppPath, options = {}) {
  try {
    runDevicectlWithRetry(
      'Apple Watch install',
      ['device', 'install', 'app', '--device', watchDeviceId, watchAppPath],
      options,
    );
  } catch (error) {
    throw new Error(
      [
        `Apple Watch install failed after ${options.maxAttempts ?? WATCH_DEVICE_INSTALL_ATTEMPTS} attempts.`,
        'Build succeeded, so you can retry only the install step after unlocking the Watch and iPhone:',
        `xcrun devicectl device install app --device ${watchDeviceId} ${watchAppPath}`,
        `Last error: ${getErrorMessage(error)}`,
      ].join('\n'),
    );
  }
}

function verifyBuiltWatchApp(watchDeviceId, options = {}) {
  runDevicectlWithRetry(
    'Apple Watch app verification',
    ['device', 'info', 'apps', '--device', watchDeviceId, '--bundle-id', WATCH_BUNDLE_ID],
    options,
  );
}

function getWatchDeviceId(projectRoot = path.resolve(__dirname, '..')) {
  if (process.env.WATCH_DEVICE_ID) {
    return process.env.WATCH_DEVICE_ID;
  }

  const { workspacePath } = getWatchInstallPaths(projectRoot);
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
  if (watchDeviceId) {
    return watchDeviceId;
  }

  const destinationsResult = spawnSync(
    'xcodebuild',
    ['-workspace', workspacePath, '-scheme', WATCH_SCHEME, '-showdestinations'],
    {
      encoding: 'utf8',
    },
  );

  if (destinationsResult.error) {
    throw destinationsResult.error;
  }

  if (destinationsResult.status !== 0) {
    throw new Error(
      [
        'Failed to list watchOS destinations with xcodebuild.',
        destinationsResult.stderr && destinationsResult.stderr.trim(),
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const destinationWatchDeviceId = parseWatchDeviceIdFromXcodebuildDestinations(
    [destinationsResult.stdout, destinationsResult.stderr].filter(Boolean).join('\n'),
  );
  if (!destinationWatchDeviceId) {
    throw new Error(
      [
        'No available Apple Watch device was found.',
        'Unlock the Apple Watch, keep it near the iPhone/Mac, then run `xcrun xctrace list devices`.',
      ].join('\n'),
    );
  }

  return destinationWatchDeviceId;
}

function installWatchDevice(projectRoot = path.resolve(__dirname, '..')) {
  const { watchAppPath } = getWatchInstallPaths(projectRoot);

  buildWatchApp(projectRoot);
  const watchDeviceId = getWatchDeviceId(projectRoot);
  installBuiltWatchApp(watchDeviceId, watchAppPath);
  verifyBuiltWatchApp(watchDeviceId);
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
  buildWatchApp,
  getWatchInstallPaths,
  installBuiltWatchApp,
  installWatchDevice,
  parseWatchDeviceIdFromXcodebuildDestinations,
  parseWatchDeviceIdFromXctrace,
  runDevicectlWithRetry,
  verifyBuiltWatchApp,
};
