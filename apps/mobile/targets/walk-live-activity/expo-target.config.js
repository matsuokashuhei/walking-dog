/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => {
  const group = config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [];
  return {
    type: 'widget',
    name: 'walk-live-activity',
    displayName: 'Walking Dog Live Activity',
    bundleIdentifier: '.liveactivity',
    deploymentTarget: '17.0',
    entitlements: {
      'com.apple.security.application-groups': group,
    },
  };
};
