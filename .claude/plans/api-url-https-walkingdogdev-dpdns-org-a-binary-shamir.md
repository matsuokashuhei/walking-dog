# Plan: サブミットに近い形でローカル Archive ビルド & 実機インストール

## Context

現在のインストール方法：

```bash
API_URL=https://walkingdogdev.dpdns.org APP_ENV=dev \
  npx expo run:ios --device --configuration Release
```

これは Release configuration でビルドはしているものの、

- **Bundle ID は dev (`com.walkingdog.dev`)**
- **PRODUCT_NAME は `WalkingDoglocal`** (前回 prebuild が APP_ENV 未指定で走ったため "Walking Dog (local)" 由来)
- **Archive ではなく Build & Run** (Xcode の Archive 配布フローを通っていない)

サブミットされる .ipa との差分は (1) Bundle ID、(2) Archive 配布で適用される最終最適化 (dSYM 生成、symbol stripping、bitcode/embedded swift libraries の調整など)、(3) 配布用 Provisioning Profile での署名、の 3 点。

ゴール: 上記 3 点を **本番 Bundle (`com.walkingdog.app`) + Xcode Archive + Distribution-style export** で再現し、実機にインストールして「サブミットされる .ipa とほぼ同じ挙動」を確認する。

制約 (確認済み):
- 本番 API は未デプロイ → API_URL は `walkingdogdev.dpdns.org` 継続
- `.env.production` は placeholder (`https://api.walkingdog.example.com`) なので override が必要
- 配布方法は **ローカル Archive + Development/Ad Hoc export**（TestFlight 系は採用しない）

---

## Approach

1. `.env.production.local` を作成して API_URL を `walkingdogdev.dpdns.org` に上書き（gitignore 対象）
2. `APP_ENV=production` で `expo prebuild --clean` を実行 → 本番 Bundle ID (`com.walkingdog.app`)・PRODUCT_NAME (`WalkingDog`)・App Group (`group.com.walkingdog.app`) で `ios/` を再生成
3. Xcode で workspace を開き **Product → Archive**
4. Organizer から **Distribute App → Development**（無料 Apple Developer Personal Team 想定）または **Ad Hoc**（Paid Developer Program の場合）で `.ipa` を export
5. **Window → Devices and Simulators** から `.ipa` を実機に install

各ステップは下記の "Steps" 節に詳述。

---

## Critical files

| 役割 | パス |
|---|---|
| 環境変数 override (新規作成) | `apps/mobile/.env.production.local` |
| APP_ENV / Bundle ID 分岐 | `apps/mobile/app.config.ts` (L4–L8, L23) |
| Live Activity Bundle suffix | `apps/mobile/targets/walk-live-activity/expo-target.config.js` |
| API_URL 読み出し | `apps/mobile/lib/graphql/client.ts:8` (`Constants.expoConfig?.extra?.apiUrl`) |
| 既存 .env (参考) | `apps/mobile/.env.production` (placeholder), `.env.development` |
| `.gitignore` (確認済み: `.env*.local` 対象) | `apps/mobile/.gitignore` |

---

## Steps

### 0. 事前確認

```bash
# Apple Team が Personal か Paid か確認したい場合（任意）:
#   Xcode → Settings → Accounts → 該当 Apple ID → Team の "Role" 列を見る
#   "Free" 表示なら Personal Team (Distribution 不可、Development export のみ、7 日有効期限)
#   "Agent" / "Admin" / "Member" なら Paid Program (Ad Hoc / App Store Distribution 可能)

cd apps/mobile
git status   # 念のため未コミットの変更を確認
```

### 1. `.env.production.local` を作成

```bash
# apps/mobile/.env.production.local（新規）
API_URL=https://walkingdogdev.dpdns.org
```

> **理由**: Expo の env 読み込み順序は `.env.{NODE_ENV}.local` > `.env.local` > `.env.{NODE_ENV}` > `.env`。
> Xcode Archive 中の Metro bundler 起動時 (`react-native-xcode.sh` 経由) も `NODE_ENV=production` になり `.env.production` を読むが、`.env.production.local` が最優先で上書きする。
> `.env.local` は既に `localhost:3000` を含むため使えない（dev サーバ向け）。
> `.gitignore` の `.env*.local` でコミットされない。

### 2. 本番設定で prebuild

```bash
cd apps/mobile

# 既存の dev 用 ios/ ディレクトリを破棄して prod 設定で再生成
APP_ENV=production NODE_ENV=production \
  npx expo prebuild --platform ios --clean
```

これで native プロジェクトは下記に変わる:

| 項目 | dev (現在) | production (新) |
|---|---|---|
| `ios/` ディレクトリ名 | `ios/WalkingDoglocal*` | `ios/WalkingDog*` |
| `PRODUCT_BUNDLE_IDENTIFIER` | `com.walkingdog.dev` | `com.walkingdog.app` |
| Live Activity Bundle | `com.walkingdog.dev.liveactivity` | `com.walkingdog.app.liveactivity` |
| App Group | `group.com.walkingdog.dev` | `group.com.walkingdog.app` |
| App 表示名 | `Walking Dog (dev)` | `Walking Dog` |

### 3. Pods 再インストール

`prebuild --clean` 後に CocoaPods を入れ直す（prebuild 末尾で自動実行されるが念のため）:

```bash
cd apps/mobile/ios && pod install && cd -
```

### 4. Xcode で Archive

```bash
# ターミナルから Xcode を開く（env vars をシェルから引き継ぐため）
open apps/mobile/ios/WalkingDog.xcworkspace
```

Xcode 上で:

1. 上部のスキーム/デバイスバーで **scheme = `WalkingDog`** を選択
2. 実行先を **"Any iOS Device (arm64)"** に変更（Simulator では Archive 不可）
3. **Signing & Capabilities** タブで Team 確認:
   - Personal Team の場合: 自動署名のまま、"Provisioning Profile: Xcode Managed Profile" を確認
   - Paid Program の場合: Distribution profile が選ばれていることを確認
4. メニュー **Product → Archive**
5. ビルド完了で Organizer ウィンドウが自動で開く

### 5. .ipa を export

Organizer の Archive 一覧から最新の archive を選び **Distribute App** をクリック。

- **Personal Team**: 選択肢は **Development** のみ。次の画面で署名方式を確認 → Export 先を `~/Desktop/walking-dog-prod-ipa/` 等に保存
- **Paid Program**: **Ad Hoc** を選択（App Store 配布 distribution と同等の最適化、デバイス UDID 登録が必要）

> Personal Team の Development export でも、Release configuration / 本番 Bundle ID / Archive flow を通っているため、サブミット版とほぼ同じバイナリ最適化が掛かる。差分は署名 cert / profile のタイプのみ。

### 6. 実機にインストール

1. iPhone を Mac に有線接続
2. **Window → Devices and Simulators** を開く
3. 左サイドバーで該当デバイスを選び、右ペインの **Installed Apps** 領域へ `.ipa` をドラッグ＆ドロップ
4. インストール完了後、iPhone の設定 → 一般 → VPN とデバイス管理 で開発者を信頼（Personal Team 初回のみ）

---

## Verification

実機側:

| チェック項目 | 期待結果 |
|---|---|
| ホーム画面のアプリ名 | "Walking Dog" (dev サフィックスなし) |
| 設定 → 一般 → VPN とデバイス管理 → 該当アプリ | Bundle ID = `com.walkingdog.app` |
| 起動後ログイン → 任意の API 呼び出し | `walkingdogdev.dpdns.org` に対してリクエスト（API 側ログで確認） |
| デバッグメニュー (シミュレータの Cmd+D 相当のシェイクジェスチャ) | **出ない** (Release ビルドの確証) |
| 散歩記録開始 → Live Activity | Dynamic Island / ロック画面に表示される（App Group / 本番 Bundle が連携できている確証） |

ターミナルからの確認:

```bash
# Archive されたバイナリの Info.plist を直接 grep（Bundle ID / Version 確認）
unzip -p ~/Desktop/walking-dog-prod-ipa/WalkingDog.ipa Payload/WalkingDog.app/Info.plist \
  | plutil -convert xml1 -o - - \
  | grep -E 'CFBundleIdentifier|CFBundleShortVersionString|CFBundleVersion'
```

期待: `CFBundleIdentifier = com.walkingdog.app`、`CFBundleShortVersionString = 1.0.0`。

---

## Caveats / Notes

- **Personal Team 7 日制限**: Personal Team で署名した場合、証明書の有効期限が 7 日。期限切れ後はアプリ起動不可 → 同じ手順で再 install するか、`expo run:ios --device --configuration Release` で再書き込み必要。
- **dev ビルドへ戻す手順**: `cd apps/mobile && APP_ENV=dev npx expo prebuild --platform ios --clean` で `ios/` を dev 用に再生成。`.env.production.local` は本番 build 時のみ参照されるため残しておいて問題ない。
- **`.env.production` の placeholder**: 本番 API がデプロイされたら `apps/mobile/.env.production` の `API_URL` を実 URL に差し替え、`.env.production.local` は削除する。（このプランの範囲外）
- **App Store Connect record**: 本当に submit するには別途 App Store Connect で App ID 登録 / Bundle ID 登録 / プライバシーマニフェスト準備が必要だが、今回はインストール検証のみが目的なのでスコープ外。
- **`@bacons/apple-targets`**: Live Activity widget は app.config.ts と expo-target.config.js から自動生成される。prebuild 時に Bundle ID 接尾辞 `.liveactivity` も `com.walkingdog.app.liveactivity` に追従する（既に確認済み）。

---

## Out of scope

- EAS Build / EAS Submit の構築（`eas.json` 新規作成は今回行わない）
- TestFlight / App Store 提出フロー
- 本番 API バックエンドのデプロイ
- Distribution Provisioning Profile の Apple Developer Portal 登録
