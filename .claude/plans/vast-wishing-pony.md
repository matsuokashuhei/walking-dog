# BLE Advertiser podspec 修正 — テスト検証

## Context
BLE Advertiser Expo Module に podspec ファイルが欠けていたため、iOS autolinking がモジュールをビルドに含められず「Cannot find native module 'BleAdvertiser'」エラーが発生していた。`modules/ble-advertiser/ios/BleAdvertiser.podspec` を作成済み。prebuild + ビルド完了。

## 残タスク
- Computer Use MCP で iOS Simulator 上のアプリを操作し、散歩開始時にエラーが出ないことを確認する
