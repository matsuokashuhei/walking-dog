#!/usr/bin/env bash
# Build a Release iOS app and install it on a connected physical iPhone.
#
# 何のためのスクリプト / Why this script:
#   `expo run:ios --device --configuration Release` は Personal Team で失敗する。
#   原因は @expo/cli/build/src/run/ios/codeSigning/configureCodeSigning.js の
#   `isCodeSigningConfigured` が、pbxproj に DEVELOPMENT_TEAM があるだけで
#   「sign 済み」と判定し、`-allowProvisioningUpdates` を xcodebuild に渡さなくなるため。
#   Personal Team の Release device build には profile auto-generation が必要なので
#   profile が見つからずビルドが失敗する。
#   このスクリプトは Expo CLI を経由せず xcodebuild を直接呼び、`-allowProvisioningUpdates`
#   を渡すことでこの構造的な問題を回避する。
#
# 必須 env vars / Required env vars:
#   APP_ENV       — local | dev | production
#   API_URL       — 接続先 API URL（明示指定）
#
# 任意 env vars / Optional env vars:
#   XCBUILD_UDID  — xcodebuild が使うデバイス UDID。未指定なら最初の物理 iPhone を自動検出。
#   DEVICECTL_UUID — devicectl が使うデバイス UUID（xcodebuild とは別形式）。未指定なら最初の paired iPhone を自動検出。

set -euo pipefail

: "${APP_ENV:?APP_ENV is required (local | dev | production)}"
: "${API_URL:?API_URL is required (e.g. https://walkingdogdev.dpdns.org)}"

# xcodebuild が使う UDID（hex プレフィックス付き、xctrace で表示される形式）
XCBUILD_UDID="${XCBUILD_UDID:-}"
if [ -z "$XCBUILD_UDID" ]; then
  XCBUILD_UDID="$(xcrun xctrace list devices 2>&1 \
    | grep -v Simulator \
    | grep -E "iPhone|iPad" \
    | grep -oE '\([A-F0-9]{8}-[A-F0-9-]+\)' \
    | head -1 | tr -d '()')"
fi
[ -n "$XCBUILD_UDID" ] || {
  echo "❌ Physical iOS device not found for xcodebuild. USB 接続して画面ロック解除し、xcrun xctrace list devices で表示されるか確認してください。"
  exit 1
}

# devicectl が使う UUID（CoreDevice 層、xcodebuild の UDID とは別物）
DEVICECTL_UUID="${DEVICECTL_UUID:-}"
if [ -z "$DEVICECTL_UUID" ]; then
  DEVICECTL_UUID="$(xcrun devicectl list devices 2>/dev/null \
    | grep -E "iPhone|iPad" \
    | grep "paired" \
    | grep -oE '[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}' \
    | head -1)"
fi
[ -n "$DEVICECTL_UUID" ] || {
  echo "❌ Paired iOS device not found for devicectl. xcrun devicectl list devices で paired デバイスを確認してください。"
  exit 1
}

# 既存 ios/ があればそれを使う。無ければ --clean で生成。
# (incremental prebuild は @bacons/apple-targets と相性が悪く再生成時に失敗する)
# Reuse existing ios/ if present; otherwise generate fresh with --clean.
# (incremental prebuild conflicts with @bacons/apple-targets on re-apply)
WORKSPACE="$(ls -d ios/*.xcworkspace 2>/dev/null | head -1 || true)"
if [ -z "$WORKSPACE" ] || [ ! -d "$WORKSPACE" ]; then
  echo "→ ios/ が無いので prebuild --clean で生成 (APP_ENV=$APP_ENV)"
  APP_ENV="$APP_ENV" npx expo prebuild --platform ios --clean
  WORKSPACE="$(ls -d ios/*.xcworkspace 2>/dev/null | head -1 || true)"
fi
[ -n "$WORKSPACE" ] && [ -d "$WORKSPACE" ] || { echo "❌ ios/*.xcworkspace not found"; exit 1; }
SCHEME="$(basename "$WORKSPACE" .xcworkspace)"

# Bundle ID が現在の APP_ENV と一致するか sanity-check
EXPECTED_BUNDLE="com.walkingdog.dev"
if [ "$APP_ENV" = "production" ]; then EXPECTED_BUNDLE="com.walkingdog.app"; fi
ACTUAL_BUNDLE="$(grep -m1 "PRODUCT_BUNDLE_IDENTIFIER = $EXPECTED_BUNDLE" "$WORKSPACE/../$SCHEME.xcodeproj/project.pbxproj" || true)"
if [ -z "$ACTUAL_BUNDLE" ]; then
  echo "⚠️  ios/ の bundle ID が APP_ENV=$APP_ENV と不一致の可能性。`npx expo prebuild --platform ios --clean` で再生成してから再実行してください。"
  exit 1
fi

echo "→ xcodebuild Release ($SCHEME) for device $XCBUILD_UDID"
API_URL="$API_URL" APP_ENV="$APP_ENV" \
  xcodebuild \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release \
    -destination "id=$XCBUILD_UDID" \
    -allowProvisioningUpdates

APP_PATH="$(find "$HOME/Library/Developer/Xcode/DerivedData" \
  -name "${SCHEME}.app" \
  -path "*${SCHEME}-*Release-iphoneos*" \
  -type d 2>/dev/null | head -1)"
[ -n "$APP_PATH" ] && [ -d "$APP_PATH" ] || { echo "❌ Built .app not found under ~/Library/Developer/Xcode/DerivedData"; exit 1; }

echo "→ Installing $APP_PATH on device $DEVICECTL_UUID"
xcrun devicectl device install app --device "$DEVICECTL_UUID" "$APP_PATH"

echo "✅ Installed. Launch '$SCHEME' on the iPhone home screen."
