/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',
  name: 'WalkingDogWatch',
  displayName: 'Walking Dog',
  bundleIdentifier: 'com.walkingdog.app.watch',
  deploymentTarget: '10.0',
  frameworks: ['SwiftUI', 'WatchConnectivity', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups': ['group.com.walkingdog.app'],
  },
};
