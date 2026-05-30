/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch-widget',
  name: 'WalkingDogWatchWidget',
  displayName: 'Walking Dog',
  bundleIdentifier: 'com.walkingdog.app.watch.widgets',
  deploymentTarget: '10.0',
  colors: {
    $accent: '#4F8A63',
    $widgetBackground: '#1F2A24',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.walkingdog.app'],
  },
};
