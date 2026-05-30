Pod::Spec.new do |s|
  s.name           = 'WalkingDogWatchBridge'
  s.version        = '1.0.0'
  s.summary        = 'Apple Watch connectivity bridge for Walking Dog'
  s.description    = 'Publishes active walk snapshots to Apple Watch and receives queued walk commands.'
  s.author         = 'Walking Dog'
  s.homepage       = 'https://walkingdog.app'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
