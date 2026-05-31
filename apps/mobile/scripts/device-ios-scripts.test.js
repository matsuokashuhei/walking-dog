const { scripts } = require('../package.json');

const deviceScripts = ['ios:dev:local', 'ios:dev:dev', 'ios:dev:prod'];

describe('physical iOS npm scripts', () => {
  it.each(deviceScripts)('%s runs Expo through the provisioning hook wrapper', (scriptName) => {
    expect(scripts[scriptName]).toContain('node ./scripts/expo-run-ios-with-provisioning.cjs');
    expect(scripts[scriptName]).toContain('run:ios --device');
    expect(scripts[scriptName]).not.toContain('NODE_OPTIONS=');
  });
});
