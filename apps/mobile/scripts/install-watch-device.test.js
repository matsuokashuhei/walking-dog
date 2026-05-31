const { scripts } = require('../package.json');
const { getWatchInstallPaths, parseWatchDeviceIdFromXctrace } = require('./install-watch-device.cjs');

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

  it('uses a deterministic DerivedData path for the Watch app product', () => {
    const paths = getWatchInstallPaths('/repo/apps/mobile');

    expect(paths.derivedDataPath).toBe('/repo/apps/mobile/ios/build/watch-device-derived-data');
    expect(paths.watchAppPath).toBe(
      '/repo/apps/mobile/ios/build/watch-device-derived-data/Build/Products/Release-watchos/WalkingDogWatch.app',
    );
  });
});
