/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => {
  const group = config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [];
  const keychainGroups = config.ios?.entitlements?.['keychain-access-groups'] ?? [];
  return {
    type: 'widget',
    name: 'walk-live-activity',
    displayName: 'Walking Dog Live Activity',
    bundleIdentifier: '.liveactivity',
    deploymentTarget: '17.0',
    entitlements: {
      'com.apple.security.application-groups': group,
      'keychain-access-groups': keychainGroups,
    },
  };
};
