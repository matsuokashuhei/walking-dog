# walking-dog — mobile

React Native / Expo (managed) で実装した iOS アプリ。バックエンドは `apps/api` (Rust/Axum) に GraphQL で接続する。

開発ルールは [CLAUDE.md](./CLAUDE.md) を参照。

---

## 前提環境

| ツール | 用途 |
|---|---|
| Node.js (LTS) | npm scripts / Metro bundler |
| Xcode | iOS ネイティブビルド・署名 |
| Apple ID（Personal Team で OK） | 実機署名（無料、7 日有効） |
| iPhone 実機 | 実機検証（USB ケーブル or Wi-Fi 接続） |

`apps/api` を併用する場合は `aws-dev-env` skill / Docker Compose で API も起動しておく。

---

## 初回セットアップ

```bash
cd apps/mobile
npm install
```

Xcode → Settings → Accounts に Apple ID を追加し、Personal Team として認識されていることを確認する。実機を Mac に USB 接続して「このコンピュータを信頼」を承認する。

---

## iOS Simulator で起動する（Local 環境）

iPhone 実機を使わずに macOS の iOS Simulator でフロント開発するときの経路。Bundle ID は `com.walkingdog.dev`、API_URL は `http://localhost:3000`。シミュレータの `localhost` は macOS ホスト直結なので Docker Compose の API (`apps-api-1`) がそのまま見える。

```bash
# 1. apps/api と Docker Compose を起動しておく

# 2. シミュレータでビルド & 起動（Metro も自動で立ち上がる）
APP_ENV=local npx expo run:ios

# 特定のシミュレータを指名するとき
APP_ENV=local npx expo run:ios --device "iPhone 17"
```

ビルド後はシミュレータに「Walking Dog (Dev)」が立ち上がる。コード変更は Cmd+R で reload、Cmd+D で dev menu。

> ℹ️ `local` と `dev` は同じ Bundle ID `com.walkingdog.dev` + 同じ display name `Walking Dog (Dev)` を共有する設計。差は runtime の API_URL（`local` は localhost、`dev` は cloud）だけ。生成される iOS プロジェクトは `ios/WalkingDogDev/` で `local`/`dev` 共通。`production` だけ別 Bundle ID `com.walkingdog.app` を使う。

---

## デバイスにインストールする方法（環境別）

3 つの環境がある。Bundle ID と API_URL の組み合わせで使い分ける。

| 環境 | `APP_ENV` | API_URL | Bundle ID | 主な用途 |
|---|---|---|---|---|
| **Local** | `local` | `http://localhost:3000` | `com.walkingdog.dev` | ローカル API でフロント開発 |
| **Development** | `dev` | `https://walkingdogdev.dpdns.org` | `com.walkingdog.dev` | dev サーバ API で実機検証 |
| **Production** | `production` | `https://walkingdogdev.dpdns.org` (override) | `com.walkingdog.app` | サブミット版 .ipa に近いバイナリで検証 |

> ⚠️ `APP_ENV` 値は Bundle ID の選択（production か否か）と表示名サフィックスにしか影響しない。**API_URL は別の仕組み**で決まる：明示の `API_URL=...` が最優先、次に `.env.local`、その次に `.env.{NODE_ENV}`。`.env.local` には `API_URL=http://localhost:3000` が入っているので、`APP_ENV=dev` だけ書いても cloud には繋がらない（localhost が勝つ）。Development 環境のコマンドが必ず `API_URL=https://...` を明示しているのはそのため。

### Local 環境（ローカル API でフロント開発）

ローカルの `apps/api` と組み合わせて Debug ビルドで開発するときの経路。Metro の fast refresh が効く。

```bash
# 1. iPhone に Debug build を install（初回のみ、または env を変えたとき）
APP_ENV=local npx expo run:ios --device

# 2. 別ターミナルで Metro を起動
npm run start:local
```

iPhone で「Walking Dog (Dev)」を起動すると Metro 経由で JS をロードする。コード変更は Cmd+R で reload。

### Development 環境（dev サーバ API で実機検証）

dev サーバ (`walkingdogdev.dpdns.org`) と通信する Release ビルドを実機に焼く。Metro 不要・fast refresh なし、サブミット版に近い最適化が掛かる。

```bash
npm run build:ios:dev:device
```

このコマンドは内部で `scripts/build-ios-release.sh` を呼び、(1) 必要なら `expo prebuild --platform ios --clean`、(2) `xcodebuild -configuration Release -allowProvisioningUpdates`、(3) `xcrun devicectl device install app` を順に実行する。Personal Team で provisioning profile を自動生成しつつ Release を実機に install できる。

ビルドが終わると iPhone にアプリ「Walking Dog (Dev)」がインストールされる（Local と同じ install を上書き）。Metro 不要、Release バイナリは JS bundle 内蔵。

> ℹ️ なぜ `npx expo run:ios --device --configuration Release` を直接使わないか：Expo CLI の `XcodeBuild.js` 内 `isCodeSigningConfigured` は pbxproj に DEVELOPMENT_TEAM が baked されていれば「sign 済み」と判定し、`-allowProvisioningUpdates` を xcodebuild に渡さなくなる。結果として Personal Team の Release device build では「No profiles for `com.walkingdog.dev` were found」で失敗する。`scripts/build-ios-release.sh` は xcodebuild を直接呼んでこのフラグを必ず付与することで構造的に回避する。

### Production 環境（サブミット版に近いビルドで検証）

本番 Bundle ID (`com.walkingdog.app`) を使った Release ビルド。実際にサブミットされる .ipa とほぼ同じ構成になる。

> 本番 API は未デプロイ。当面は dev サーバ URL を `.env.production.local` で override して使う。

```bash
# 1. 初回のみ: API URL override 用の env ファイル作成（gitignore 対象）
echo "API_URL=https://walkingdogdev.dpdns.org" > .env.production.local

# 2. dev / production は Bundle ID が違うので ios/ を作り直す（一度だけ）
APP_ENV=production NODE_ENV=production \
  npx expo prebuild --platform ios --clean

# 3. ビルド & 実機 install
API_URL=https://walkingdogdev.dpdns.org npm run build:ios:prod:device
```

差分:
- アプリ表示名: 「Walking Dog」（Dev サフィックスなし）
- iOS フォルダ: `ios/WalkingDog/`（dev は `ios/WalkingDogDev/`）
- Live Activity Bundle: `com.walkingdog.app.liveactivity`
- App Group: `group.com.walkingdog.app`

---

## 環境を切り替えるとき

**Local ↔ Development**: 同じ Bundle ID `com.walkingdog.dev` + 同じ display name `Walking Dog (Dev)` + 同じ iOS フォルダ `ios/WalkingDogDev/`。**env vars だけ差し替えれば OK。prebuild の再実行は不要**。

**Local/Development ↔ Production**: Bundle ID が `com.walkingdog.dev` ↔ `com.walkingdog.app` に変わるため `npx expo prebuild --platform ios --clean` を再実行する必要あり。`ios/WalkingDogDev/` ↔ `ios/WalkingDog/` で `ios/` ディレクトリ自体が再生成される。

```bash
# 例: Production から Dev（=local/dev）に戻す
APP_ENV=dev npx expo prebuild --platform ios --clean

# 例: Dev から Production に切り替え
APP_ENV=production NODE_ENV=production npx expo prebuild --platform ios --clean
```

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `Could not find any connected device` | iPhone を USB で接続、画面ロック解除、「このコンピュータを信頼」を承認。`xcrun xctrace list devices` / `xcrun devicectl list devices` で認識されるか確認。 |
| 7 日経つとアプリが起動しなくなる | Personal Team 証明書の有効期限切れ。`npm run build:ios:dev:device` で再 install（`-allowProvisioningUpdates` で profile も自動更新）。 |
| `pod install` が失敗 | `cd ios && pod repo update && pod install` を試す。 |
| Wi-Fi で実機ビルドしたい | 一度 USB 接続して、Xcode → Window → Devices and Simulators → 該当デバイス → "Connect via network" にチェック。 |
| API_URL が反映されない | `expo prebuild --clean` を再実行（env vars はネイティブビルド時に焼き込まれるため）。 |
| `No profiles for 'com.walkingdog.dev' were found` で Release が失敗 | `expo run:ios --device --configuration Release` を直接使うと Expo CLI が `-allowProvisioningUpdates` を渡さず Personal Team の profile 自動生成が動かない。**`npm run build:ios:dev:device`** を使うこと。 |
| `xcworkspace not found` / `scheme "WalkingDog*" not found` | `ios/` 直下のフォルダ名と `app.config.ts:13` の `name` が不整合。`APP_ENV=<target> npx expo prebuild --platform ios --clean` で再生成。 |

---

## 関連ドキュメント

- 開発ルール: [CLAUDE.md](./CLAUDE.md)
- バックエンド: [`../api/CLAUDE.md`](../api/CLAUDE.md)
- プロジェクト全体: [`../../CLAUDE.md`](../../CLAUDE.md)
