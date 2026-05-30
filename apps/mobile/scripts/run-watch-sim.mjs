#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const workspace = process.env.IOS_WORKSPACE ?? 'ios/WalkingDog.xcworkspace';
const scheme = process.env.WATCH_SCHEME ?? 'WalkingDogWatch';
const configuration = process.env.CONFIGURATION ?? 'Debug';
const derivedDataPath = process.env.DERIVED_DATA_PATH ?? 'ios/build';
const appPath =
  process.env.WATCH_APP_PATH ??
  `${derivedDataPath}/Build/Products/${configuration}-watchsimulator/WalkingDogWatch.app`;
const bundleId = process.env.WATCH_BUNDLE_ID ?? 'com.walkingdog.app.watch';
const requestedSimulatorId = process.env.WATCH_SIMULATOR_ID;
const requestedSimulatorName =
  process.env.WATCH_SIMULATOR_NAME ?? 'Apple Watch Series 11 (46mm)';
const requestedSimulatorOS = process.env.WATCH_SIMULATOR_OS ?? '26.5';
const expectedPairedPhoneName =
  process.env.WATCH_PAIRED_PHONE_NAME ?? process.env.IOS_SIMULATOR_NAME ?? 'iPhone 17 Pro';

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  return execFileSync(command, args, {
    stdio: options.stdio ?? 'inherit',
    encoding: options.encoding,
  });
}

function readJson(command, args) {
  return JSON.parse(run(command, args, { encoding: 'utf8', stdio: 'pipe' }));
}

function runtimeVersion(runtimeName) {
  const match = runtimeName.match(/watchOS-(\d+)-(\d+)/);
  if (!match) {
    return [0, 0];
  }
  return [Number(match[1]), Number(match[2])];
}

function compareRuntimeVersions(left, right) {
  const [leftMajor, leftMinor] = runtimeVersion(left);
  const [rightMajor, rightMinor] = runtimeVersion(right);

  if (leftMajor !== rightMajor) {
    return leftMajor - rightMajor;
  }

  return leftMinor - rightMinor;
}

function findWatchSimulator() {
  if (requestedSimulatorId) {
    return requestedSimulatorId;
  }

  const devicesByRuntime = readJson('xcrun', [
    'simctl',
    'list',
    'devices',
    'available',
    '-j',
  ]).devices;

  const candidates = Object.entries(devicesByRuntime)
    .filter(([runtime]) => runtime.includes('watchOS'))
    .filter(([runtime]) => {
      if (!requestedSimulatorOS) {
        return true;
      }

      return runtime.includes(`watchOS-${requestedSimulatorOS.replace('.', '-')}`);
    })
    .flatMap(([runtime, devices]) =>
      devices
        .filter((device) => device.name === requestedSimulatorName)
        .map((device) => ({ ...device, runtime })),
    )
    .sort((left, right) => compareRuntimeVersions(right.runtime, left.runtime));

  const booted = candidates.find((device) => device.state === 'Booted');
  const selected = booted ?? candidates[0];

  if (!selected) {
    throw new Error(
      [
        `No available watchOS simulator matched "${requestedSimulatorName}"`,
        requestedSimulatorOS ? `with watchOS ${requestedSimulatorOS}.` : '.',
        'Set WATCH_SIMULATOR_ID, WATCH_SIMULATOR_NAME, or WATCH_SIMULATOR_OS to choose another device.',
      ].join(' '),
    );
  }

  return selected.udid;
}

function bootWatchSimulator(simulatorId) {
  const devicesByRuntime = readJson('xcrun', [
    'simctl',
    'list',
    'devices',
    'available',
    '-j',
  ]).devices;

  const selected = Object.values(devicesByRuntime)
    .flat()
    .find((device) => device.udid === simulatorId);

  if (!selected) {
    throw new Error(`Watch simulator ${simulatorId} is not available.`);
  }

  if (selected.state !== 'Booted') {
    run('xcrun', ['simctl', 'boot', simulatorId]);
  }

  run('xcrun', ['simctl', 'bootstatus', simulatorId, '-b']);
}

function findPairForWatch(simulatorId) {
  const pairs = readJson('xcrun', ['simctl', 'list', 'pairs', '-j']).pairs;

  return Object.values(pairs).find((pair) => pair.watch.udid === simulatorId);
}

function ensurePairedPhoneIsBooted(simulatorId) {
  const pair = findPairForWatch(simulatorId);

  if (!pair) {
    throw new Error(`Watch simulator ${simulatorId} is not paired with an iPhone simulator.`);
  }

  if (pair.phone.name !== expectedPairedPhoneName) {
    throw new Error(
      [
        `The paired iPhone simulator is ${pair.phone.name} (${pair.phone.udid}), but watch:sim expects ${expectedPairedPhoneName}.`,
        'Pair the Watch simulator with the same iPhone used by `npm run ios:sim:local`, or set WATCH_PAIRED_PHONE_NAME.',
      ].join(' '),
    );
  }

  if (pair.phone.state !== 'Booted') {
    throw new Error(
      [
        `The paired iPhone simulator is ${pair.phone.name} (${pair.phone.udid}), but it is ${pair.phone.state}.`,
        'Start the iPhone app on that paired simulator first with `npm run ios:sim:local`, then run `npm run watch:sim` again.',
      ].join(' '),
    );
  }

  console.log(`Paired iPhone simulator is ${pair.phone.name} (${pair.phone.udid})`);
}

const simulatorId = findWatchSimulator();
console.log(`Using watch simulator ${simulatorId}`);
bootWatchSimulator(simulatorId);
ensurePairedPhoneIsBooted(simulatorId);

run('xcodebuild', [
  '-workspace',
  workspace,
  '-scheme',
  scheme,
  '-configuration',
  configuration,
  '-destination',
  `id=${simulatorId}`,
  '-derivedDataPath',
  derivedDataPath,
  'build',
]);

if (!existsSync(appPath)) {
  throw new Error(`Built Watch app was not found at ${appPath}.`);
}

run('xcrun', ['simctl', 'install', simulatorId, appPath]);
run('xcrun', ['simctl', 'launch', simulatorId, bundleId]);
