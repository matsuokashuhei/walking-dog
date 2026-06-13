# Maestro E2E テスト

このディレクトリには、iOS Simulator で実行する Maestro flow を置いています。
基本の確認は `auth-onboarding.yaml` です。アカウント作成、メール確認、ログイン、パスワード変更までを通します。

## 前提

- Maestro CLI がインストール済みであること。
- Xcode Simulator が利用でき、`iPhone 17 Pro` を起動できること。
- Simulator の言語が英語であること。Maestro flow は英語 UI text を selector に使います。
- `apps/mobile` の依存関係がインストール済みであること。
- API と Cognito-local を含む harness dev stack が起動していること。

```bash
cd apps/mobile
npm ci
cd ../..
node scripts/harness/dev-stack.mjs up
```

dev stack の API port は worktree ごとに変わります。起動後に次のファイルで確認できます。

```bash
cat .harness-runs/dev-stack/env.json
```

## アプリを Simulator に入れる

`auth-onboarding.yaml` は `launchApp.clearState: true` を使います。Debug/dev-client build だと clear state 後に Expo Dev Launcher が開くことがあるため、Maestro では Release build を使います。

repo root から API port を読んでから、`apps/mobile` で build します。

```bash
export WD_API_PORT="$(node -p "require('./.harness-runs/dev-stack/env.json').ports.api")"

cd apps/mobile
npm run metro:kill
npm run ios:clean
EXPO_PUBLIC_E2E=1 \
EXPO_PUBLIC_API_URL="http://127.0.0.1:${WD_API_PORT}" \
npx expo run:ios --configuration Release --device "iPhone 17 Pro"
```

build が完了すると `com.walkingdog.app` が Simulator にインストールされます。Expo/Metro のログ表示は残したまま、別 terminal で Maestro を実行します。

## Maestro を実行する

repo root から実行します。

```bash
maestro test apps/mobile/e2e/maestro/auth-onboarding.yaml
```

すべての flow をまとめて実行する場合:

```bash
maestro test apps/mobile/e2e/maestro/*.yaml
```

`auth-onboarding.yaml` 以外の flow は、認証済み owner、登録済み dog、位置情報や写真権限などの seed/harness 状態を前提にしています。各 YAML 先頭の `Harness preconditions` を満たしてから実行してください。

Java runtime が見つからない場合は、Maestro 実行時に `JAVA_HOME` と `PATH` を指定します。Homebrew の OpenJDK を使う例:

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk \
PATH=/opt/homebrew/opt/openjdk/bin:$PATH \
maestro test apps/mobile/e2e/maestro/auth-onboarding.yaml
```

## 終了後の片付け

Expo/Metro の terminal は `Ctrl-C` で止めます。harness dev stack も不要なら停止します。

```bash
node scripts/harness/dev-stack.mjs down
```

`takeScreenshot` を含む flow は、実行した current directory に `harness-*.png` を生成します。証跡として使う場合だけ残し、通常は commit しません。

## よくある失敗

- `Create an account` が見つからない: Debug build の clear state で Expo Dev Launcher が開いている可能性があります。Release build で入れ直してください。
- API に接続できない: `.harness-runs/dev-stack/env.json` の `ports.api` と `EXPO_PUBLIC_API_URL` が一致しているか確認してください。
- text selector が見つからない: Simulator の言語が英語か、対象 flow の seed data が存在するか確認してください。
- パスワード関連で失敗する: `E2E_PASSWORD` / `E2E_NEW_PASSWORD` は Cognito policy を満たす値にします。現在の auth flow は `Password123` と `Newpass1` を使います。
