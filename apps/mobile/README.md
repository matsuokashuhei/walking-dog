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

## ビルド & インストール

スクリプトは「install target × API 環境」の2軸で命名: `ios:<target>:<env>`。

| Script | Install | API URL | Configuration |
|---|---|---|---|
| `npm run ios:sim:local` | Simulator | `http://localhost:3000` | Debug |
| `npm run ios:sim:dev` | Simulator | `https://walking-dog.cacheandbuffer.com` | Debug |
| `npm run ios:sim:prod` | Simulator | `https://walking-dog.cacheandbuffer.com`（※本番未デプロイ） | Release |
| `npm run ios:dev:local` | Device | `http://localhost:3000` | Debug |
| `npm run ios:dev:dev` | Device | `https://walking-dog.cacheandbuffer.com` | Release |
| `npm run ios:dev:prod` | Device | `https://walking-dog.cacheandbuffer.com`（※本番未デプロイ） | Release |

API URL は `EXPO_PUBLIC_API_URL` をスクリプト内でインライン指定し、`process.env.EXPO_PUBLIC_API_URL` 経由で JS バンドルにビルド時 inline される。`.env.*` ファイルは使用しない。

実機で dev サーバ相手に Metro / fast refresh を使いたいときだけ、例外として `npm run ios:dev:dev:debug` を使う。これは Debug dev-client build を install し、`npm run start:dev-client` と組み合わせて使う。

Bundle ID は全プロファイル共通で `com.walkingdog.app`。

---

## API 環境別の使い分け

### Local (`localhost:3000`) — フロント開発

ローカル `apps/api` と組み合わせて Debug ビルド。Metro fast refresh が効く。

- **Simulator**: `npm run ios:sim:local`
- **実機**: 実機からは `localhost` が iPhone 自身になるため URL は届かない。LAN IP に差し替えて起動する：
  ```bash
  EXPO_PUBLIC_API_URL=http://<MacのLAN_IP>:3000 npm run ios:dev:local
  ```

### Development (`walking-dog.cacheandbuffer.com`) — dev サーバ検証

dev サーバの Rust API と通信する。Metro 不要・fast refresh なし。

- **Simulator**: `npm run ios:sim:dev`
- **実機**: `npm run ios:dev:dev`
- **実機で Metro も使う**: `npm run ios:dev:dev:debug` で Debug build を入れ、別ターミナルで `npm run start:dev-client`

### Production — サブミット版に近い検証

Release ビルド。本番 API は未デプロイのため当面は dev サーバ URL を流用。

- **Simulator**: `npm run ios:sim:prod`
- **実機**: `npm run ios:dev:prod`

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `EXPO_PUBLIC_API_URL` を変えても反映されない | `EXPO_PUBLIC_*` はビルド時に焼き込まれるため `expo run:ios` を再実行（必要に応じて `npx expo prebuild --platform ios --clean`） |
| `Could not find any connected device` | iPhone を USB 接続、ロック解除、「このコンピュータを信頼」を承認。`xcrun xctrace list devices` で認識確認 |
| `No apps connected. Sending "devMenu"...` | `npm run ios:dev:dev` は Release なので Metro には接続しない。Metro が必要なら `npm run ios:dev:dev:debug` を install し、`npm run start:dev-client` を同じ LAN で起動する |
| 7 日経つとアプリが起動しなくなる | Personal Team 証明書の有効期限切れ。同じ手順で再 install |
| `pod install` が失敗 | `cd ios && pod repo update && pod install` |
| Wi-Fi で実機ビルドしたい | 一度 USB 接続して、Xcode → Window → Devices and Simulators → 該当デバイス → "Connect via network" にチェック |
| 実機で `localhost` に届かない | 上記「Local — 実機」を参照、LAN IP を渡す |

---

## 関連ドキュメント

- 開発ルール: [CLAUDE.md](./CLAUDE.md)
- バックエンド: [`../api/CLAUDE.md`](../api/CLAUDE.md)
- プロジェクト全体: [`../../CLAUDE.md`](../../CLAUDE.md)
