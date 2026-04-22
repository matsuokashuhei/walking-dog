# Plan: shared keychain (App Group) 復活

## Context

Apple Personal Team 署名では `keychain-access-groups` entitlement を provision できないため、`apps/mobile/lib/auth/secure-storage.ts:17` で `sharedOptions = undefined` 固定にして暫定回避していた。これにより:

- Live Activity widget (`targets/walk-live-activity/SharedKeychain.swift`) がトークンを読めない
- `migrateLegacyTokens` (`auth-store.ts:41` から呼ばれる) は no-op 状態

ユーザーが有料 Apple Developer Program に加入したため、shared keychain (App Group + keychain access group) を恒久的に復活させる。復活後は widget からも同じトークンを `SecItemCopyMatching` で読み出せるようになり、Live Activity の認証付き API 呼び出しが成立する。

## 修正対象ファイル

| ファイル | 修正内容 |
|---|---|
| `apps/mobile/app.config.ts` | `ios.entitlements` に `keychain-access-groups` を追加 |
| `apps/mobile/lib/auth/secure-storage.ts` | `sharedOptions` を `extras.appGroup` + `extras.keychainService` から復元（コミット `63e7540` 以前のロジックを復活） |
| `apps/mobile/lib/auth/secure-storage.test.ts` | `sharedOptions` が設定されるケースの assertion を追加 |
| `apps/mobile/targets/walk-live-activity/expo-target.config.js` | 必要に応じ widget 側 entitlements に `keychain-access-groups` 継承を明示（既に `application-groups` を継承しているため要確認） |
| `apps/mobile/ios/**/*.entitlements` | `expo prebuild --clean` で再生成（手編集しない） |

## 実装手順

### 1. `app.config.ts` の entitlements 拡張

現在 (`app.config.ts:33-35`):
```ts
entitlements: {
  'com.apple.security.application-groups': [APP_GROUP],
},
```

変更後:
```ts
entitlements: {
  'com.apple.security.application-groups': [APP_GROUP],
  'keychain-access-groups': [`$(AppIdentifierPrefix)${APP_GROUP}`],
},
```

`$(AppIdentifierPrefix)` は Xcode/codesign が Team ID に展開するプレースホルダ。`expo-secure-store` は `accessGroup` オプション値（= `APP_GROUP`）を `kSecAttrAccessGroup` にそのまま渡し、iOS が自動で `$(AppIdentifierPrefix)` プレフィックスと突合する。

### 2. `secure-storage.ts` の `sharedOptions` 復元

`apps/mobile/lib/auth/secure-storage.ts:1-17` を以下に差し戻す（コミット `63e7540` の構造）:

```ts
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ... keys ...

const extras = (Constants.expoConfig?.extra ?? {}) as {
  appGroup?: string;
  keychainService?: string;
};

const sharedOptions: SecureStore.SecureStoreOptions | undefined =
  Platform.OS === 'ios' && extras.appGroup && extras.keychainService
    ? { accessGroup: extras.appGroup, keychainService: extras.keychainService }
    : undefined;
```

`migrateLegacyTokens` 本体 (`secure-storage.ts:46-60`) は変更不要 — `!sharedOptions` ガードが false に変わるだけで既存ロジックがそのまま走る。

### 3. テスト更新

`apps/mobile/lib/auth/secure-storage.test.ts:14-17` の `expo-constants` モックで `extra.appGroup` / `extra.keychainService` を固定し、

- `setItemAsync` / `getItemAsync` 呼び出し時の第2引数に `{ accessGroup: 'group.com.walkingdog.dev', keychainService: 'com.walkingdog.shared' }` が渡ることを assertion 追加
- `migrateLegacyTokens` が `MIGRATION_DONE_KEY` を共有スコープ側に書くケース（既存テスト 72-99 行）が引き続き green

### 4. Xcode signing 設定

`expo prebuild --clean` 実行後:

1. `apps/mobile/ios/WalkingDoglocal.xcworkspace` を開く
2. WalkingDoglocal target → Signing & Capabilities タブ
3. Team を Personal Team から有料 Apple Developer Program team に切り替え
4. `Keychain Sharing` capability が自動追加され `group.com.walkingdog.dev` が表示されることを確認
5. `App Groups` capability に `group.com.walkingdog.dev` がチェックされていることを確認
6. walk-live-activity target についても同様に Team / capability 確認
7. Apple Developer Portal で App ID `com.walkingdog.dev` および `com.walkingdog.dev.WalkLiveActivity` (widget) に App Groups + Keychain Sharing が enabled になっていることを確認（Xcode 自動 provisioning が処理）

### 5. prebuild と pod install

```bash
cd apps/mobile
npx expo prebuild --clean
cd ios && pod install
```

`ios/WalkingDoglocal/WalkingDoglocal.entitlements` が空 `<dict/>` から `application-groups` + `keychain-access-groups` を含む状態に再生成されることを diff で確認。

## 検証

### 単体
```bash
cd apps/mobile
npm test -- secure-storage auth-store
```

### 実機 e2e (sakura環境)
```bash
API_URL=https://walkingdogdev.dpdns.org APP_ENV=dev \
  npx expo run:ios --device --configuration Release
```

確認項目:
1. **新規ログイン**: Welcome → Login → トークン取得 → walk タブ遷移
2. **永続化**: アプリを kill → 再起動 → 自動ログイン状態
3. **Live Activity**: 散歩開始 → ロック画面の Live Activity 表示 → widget からの API リクエスト（GraphQL）が 401 を返さない（widget が共有 keychain からトークン取得できている証跡）
4. **既存ユーザー migration**: 旧暫定版 (default scope) でログイン状態のまま新版にビルド差し替え → `migrateLegacyTokens` がデフォルトスコープから共有スコープへ移行 → 再ログイン不要
5. **simulator**: `npm run ios` で iPhone 16 Pro sim 起動 → ログインフローで `getValueWithKeyAsync` の entitlement エラーが再発しないこと

### 既存メモリ更新

`~/.claude/projects/-Users-matsuokashuhei-Development-walking-dog/memory/project_iphone_dev_setup.md` の以下を改訂:

- 「`sharedOptions` は `undefined` 固定」→ shared keychain 復活済みに変更
- Personal Team 制約セクションを「過去の記録」として簡略化
- 新たに有料 Apple Developer team の Team ID と provisioning profile 名を記載
