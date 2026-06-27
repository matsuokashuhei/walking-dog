const { scripts } = require('../package.json');
const {
  buildWatchApp,
  getWatchInstallPaths,
  installBuiltWatchApp,
  parseWatchDeviceIdFromXcodebuildDestinations,
  parseWatchDeviceIdFromXctrace,
  runDevicectlWithRetry,
} = require('./install-watch-device.cjs');

describe('Apple Watch device install script', () => {
  it('is exposed through an npm script', () => {
    expect(scripts['watch:dev']).toBe('node ./scripts/install-watch-device.cjs');
  });

  it('finds the Apple Watch UDID from the online Devices section', () => {
    const output = [
      '== Devices ==',
      'matsuokashuhei MacBook Pro (2853EFA0-19C3-536C-992B-A85EBFD90DDC)',
      'My Apple Watch (26.5) (00008310-000E5C613A00E01E)',
      'My iPhone (26.5) (00008120-001A2DE83A3B401E)',
      '',
      '== Devices Offline ==',
      'Old Apple Watch (26.5) (00000000-0000000000000000)',
    ].join('\n');

    expect(parseWatchDeviceIdFromXctrace(output)).toBe('00008310-000E5C613A00E01E');
  });

  it('does not use an Apple Watch from the offline section', () => {
    const output = [
      '== Devices ==',
      'matsuokashuhei MacBook Pro (2853EFA0-19C3-536C-992B-A85EBFD90DDC)',
      '',
      '== Devices Offline ==',
      'My Apple Watch (26.5) (00008310-000E5C613A00E01E)',
    ].join('\n');

    expect(parseWatchDeviceIdFromXctrace(output)).toBeNull();
  });

  it('finds the physical Apple Watch UDID from xcodebuild destinations', () => {
    const output = [
      'Available destinations for the "WalkingDogWatch" scheme:',
      '\t{ platform:watchOS, arch:arm64, id:00008310-000E5C613A00E01E, name:Shuhei’s Apple Watch }',
      '\t{ platform:watchOS, id:dvtdevice-DVTiOSDevicePlaceholder-watchos:placeholder, name:Any watchOS Device }',
      '\t{ platform:watchOS Simulator, arch:arm64, id:48D461D1-2F56-4F5F-8E01-07DE6CC34638, OS:26.5, name:Apple Watch SE 3 (40mm) }',
    ].join('\n');

    expect(parseWatchDeviceIdFromXcodebuildDestinations(output)).toBe(
      '00008310-000E5C613A00E01E',
    );
  });

  it('uses a deterministic DerivedData path for the Watch app product', () => {
    const paths = getWatchInstallPaths('/repo/apps/mobile');

    expect(paths.derivedDataPath).toBe('/repo/apps/mobile/ios/build/watch-device-derived-data');
    expect(paths.watchAppPath).toBe(
      '/repo/apps/mobile/ios/build/watch-device-derived-data/Build/Products/Release-watchos/WalkingDogWatch.app',
    );
  });

  it('retries transient devicectl failures before succeeding', () => {
    const run = jest.fn(() => {
      if (run.mock.calls.length < 3) {
        throw new Error('Connection interrupted');
      }
    });
    const sleep = jest.fn();

    runDevicectlWithRetry('install Apple Watch app', ['device', 'install', 'app'], {
      maxAttempts: 3,
      retryDelayMs: 10,
      run,
      sleep,
      warn: jest.fn(),
    });

    expect(run).toHaveBeenCalledTimes(3);
    expect(run).toHaveBeenCalledWith('xcrun', ['devicectl', 'device', 'install', 'app']);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it('reports the direct install command after repeated install failures', () => {
    const run = jest.fn(() => {
      throw new Error('tunnel handshake timed out');
    });
    const sleep = jest.fn();

    expect(() =>
      installBuiltWatchApp('00008310-000E5C613A00E01E', '/repo/WalkingDogWatch.app', {
        maxAttempts: 2,
        retryDelayMs: 10,
        run,
        sleep,
        warn: jest.fn(),
      }),
    ).toThrow(
      [
        'Apple Watch install failed after 2 attempts.',
        'Build succeeded, so you can retry only the install step after unlocking the Watch and iPhone:',
        'xcrun devicectl device install app --device 00008310-000E5C613A00E01E /repo/WalkingDogWatch.app',
        'Last error: tunnel handshake timed out',
      ].join('\n'),
    );
    expect(run).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('builds with a generic watchOS destination instead of waiting for the physical Watch', () => {
    const run = jest.fn();

    buildWatchApp('/repo/apps/mobile', '00008310-000E5C613A00E01E', { run });

    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0]).toBe('xcodebuild');
    expect(run.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['-destination', 'generic/platform=watchOS']),
    );
    expect(run.mock.calls[0][1]).not.toContain('platform=watchOS,id=00008310-000E5C613A00E01E');
  });
});
