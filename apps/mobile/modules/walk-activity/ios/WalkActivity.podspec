Pod::Spec.new do |s|
  s.name           = 'WalkActivity'
  s.version        = '0.1.0'
  s.summary        = 'Walk Live Activity Expo Module'
  s.description    = 'Starts, updates, and ends ActivityKit Live Activity for ongoing walks'
  s.license        = 'MIT'
  s.author         = 'Walking Dog'
  s.homepage       = 'https://github.com/example'
  s.platforms      = { :ios => '17.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.{h,m,swift}'
end
