Pod::Spec.new do |s|
  s.name           = 'BleAdvertiser'
  s.version        = '0.1.0'
  s.summary        = 'BLE Advertiser Expo Module'
  s.description    = 'BLE peripheral advertising for Walking Dog encounter detection'
  s.license        = 'MIT'
  s.author         = 'Walking Dog'
  s.homepage       = 'https://github.com/example'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.{h,m,swift}'
end
