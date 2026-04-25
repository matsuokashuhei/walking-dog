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

## デバイスにインストールする方法（環境別）

3 つの環境がある。Bundle ID と API_URL の組み合わせで使い分ける。

| 環境 | API_URL | Bundle ID | 主な用途 |
|---|---|---|---|
| **Local** | `http://localhost:3000` | `com.walkingdog.dev` | ローカル API でフロント開発 |
| **Development** | `https://walkingdogdev.dpdns.org` | `com.walkingdog.dev` | dev サーバ API で実機検証 |
| **Production** | `https://walkingdogdev.dpdns.org` (override) | `com.walkingdog.app` | サブミット版 .ipa に近いバイナリで検証 |

### Local 環境（ローカル API でフロント開発）

ローカルの `apps/api` と組み合わせて Debug ビルドで開発するときの経路。Metro の fast refresh が効く。

```bash
# 1. iPhone に Debug build を install（初回のみ、または env を変えたとき）
APP_ENV=dev npx expo run:ios --device

# 2. 別ターミナルで Metro を起動
npm run start:dev
```

iPhone で「Walking Dog (dev)」を起動すると Metro 経由で JS をロードする。コード変更は Cmd+R で reload。

### Development 環境（dev サーバ API で実機検証）

dev サーバ (`walkingdogdev.dpdns.org`) と通信する Release ビルドを実機に焼く。Metro 不要・fast refresh なし、サブミット版に近い最適化が掛かる。

```bash
API_URL=https://walkingdogdev.dpdns.org APP_ENV=dev \
  npx expo run:ios --device --configuration Release
```

ビルドが終わると iPhone にアプリ「Walking Dog (dev)」がインストールされ、Metro サーバはこの時点で Ctrl+C で落として OK（Release ビルドは JS bundle 内蔵のため）。

### Production 環境（サブミット版に近いビルドで検証）

本番 Bundle ID (`com.walkingdog.app`) を使った Release ビルド。実際にサブミットされる .ipa とほぼ同じ構成になる。

> 本番 API は未デプロイ。当面は dev サーバ URL を `.env.production.local` で override して使う。

```bash
# 1. 初回のみ: API URL override 用の env ファイル作成（gitignore 対象）
echo "API_URL=https://walkingdogdev.dpdns.org" > .env.production.local

# 2. 本番設定で native プロジェクトを再生成
APP_ENV=production NODE_ENV=production \
  npx expo prebuild --platform ios --clean

# 3. ビルド & 実機 install
API_URL=https://walkingdogdev.dpdns.org APP_ENV=production NODE_ENV=production \
  npx expo run:ios --device --configuration Release
```

差分:
- アプリ表示名: 「Walking Dog」（dev サフィックスなし）
- Live Activity Bundle: `com.walkingdog.app.liveactivity`
- App Group: `group.com.walkingdog.app`

---

## 環境を切り替えるとき

**Local ↔ Development**（同じ Bundle ID）: env vars だけ差し替えれば OK。

**Local/Development ↔ Production**（Bundle ID が変わる）: `npx expo prebuild --platform ios --clean` を再実行する必要あり。`ios/WalkingDoglocal*` ↔ `ios/WalkingDog*` で `ios/` ディレクトリ自体が再生成される。

```bash
# 例: Production から Development に戻す
APP_ENV=dev npx expo prebuild --platform ios --clean
```

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `Could not find any connected device` | iPhone を USB で接続、画面ロック解除、「このコンピュータを信頼」を承認。`xcrun xctrace list devices` で認識されるか確認。 |
| 7 日経つとアプリが起動しなくなる | Personal Team 証明書の有効期限切れ。同じ手順で再 install。 |
| `pod install` が失敗 | `cd ios && pod repo update && pod install` を試す。 |
| Wi-Fi で実機ビルドしたい | 一度 USB 接続して、Xcode → Window → Devices and Simulators → 該当デバイス → "Connect via network" にチェック。 |
| API_URL が反映されない | `expo prebuild --clean` を再実行（env vars はネイティブビルド時に焼き込まれるため）。 |

---

## 関連ドキュメント

- 開発ルール: [CLAUDE.md](./CLAUDE.md)
- バックエンド: [`../api/CLAUDE.md`](../api/CLAUDE.md)
- プロジェクト全体: [`../../CLAUDE.md`](../../CLAUDE.md)
