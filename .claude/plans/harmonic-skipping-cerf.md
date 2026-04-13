# Fix: Unmatched Route on `expo run:ios --device`

## Context

`API_URL=https://walkingdogdev.dpdns.org npx expo run:ios --device` で実機起動時、Expo Router の **"Unmatched Route — Page could not be found"** 画面が出る。

**根本原因**: PR #80 (`676214b feat(mobile): merge HOME tab into WALK tab`) で `apps/mobile/app/(tabs)/index.tsx`（旧 HOME タブ）を削除した。同時に `(tabs)/_layout.tsx` から `<Tabs.Screen name="index">` を消し、`initialRouteName="walk"` を追加した。

しかし、プロジェクトには以下が存在しない:

- `apps/mobile/app/index.tsx` — ルート `/` のエントリ
- `apps/mobile/app/(tabs)/index.tsx` — `(tabs)` グループのエントリ
- `apps/mobile/app/+not-found.tsx` — フォールバック

`npx expo run:ios --device` は実機インストール後にアプリを URL スキーム `walking-dog://`（`app.config.ts:15` の `scheme: 'walking-dog'`）で起動する。`Linking.getInitialURL()` は `walking-dog://` を返し、Expo Router はパス `/` を解決しようとするが、`app/index.tsx` が無いため Unmatched Route にフォールバックする。

Simulator で `npx expo run:ios`（`--device` なし）はアプリをスキーム起動せずにそのまま立ち上げるため `getInitialURL()` が null となり、`unstable_settings.anchor='(tabs)'`（`app/_layout.tsx:48-50`）が働いて `(tabs)/walk` に到達できていた。

**期待結果**: 実機・Simulator 両方で、認証済みなら WALK タブ、未認証なら `(auth)/login` に遷移する。

## 推奨アプローチ

### 1. `apps/mobile/app/index.tsx` を追加（最小の修正）

`/` を `/(tabs)` にリダイレクトするエントリ。`NavigationGuard`（`app/_layout.tsx:20-46`）が `isAuthenticated` を監視して `(auth)/login` へ replace するため、認証済みユーザーのみ `(tabs)/walk` に到達する。

```tsx
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)" />;
}
```

expo-router は `(tabs)` の `initialRouteName="walk"` を尊重して `walk.tsx` を描画する。

### 2. `NavigationGuard` のレンダリング順序を固定（副次修正）

`app/_layout.tsx` は `<NavigationGuard />` を `<Stack>` の前に置いているが、`useSegments()` は初回マウント時に `[]` を返す可能性がある。`getInitialURL()` が `walking-dog://` の場合、segments が空配列になり `inAuthGroup=false` と判定され、未認証時は `/(auth)/login` に replace される。これは意図通り。

ただし `app/index.tsx` が追加されれば `Redirect` が先に解決されるので、ガードは後続の segment 監視だけでよい。追加修正は不要。

### 3. `+not-found.tsx` を追加（保険）

万一ルート不一致が再発した場合に備え、`/(tabs)/walk` へリダイレクトする `+not-found.tsx` を用意する。

```tsx
// apps/mobile/app/+not-found.tsx
import { Redirect } from 'expo-router';

export default function NotFound() {
  return <Redirect href="/(tabs)/walk" />;
}
```

ただしデバッグ中は本物の Unmatched Route 画面を残したほうが問題検出しやすい。**今回は追加しない** — ルート解決が正しく動くことを優先する。

## 実装タスク（TDD）

| # | タスク | ファイル | 検証 |
|---|--------|---------|------|
| 1 | `app/index.tsx` 追加（Redirect to `/(tabs)`） | `apps/mobile/app/index.tsx`（新規） | `npx expo start --clear` で Simulator 起動、WALK 画面表示 |
| 2 | 認証ガード動作確認（ログアウト状態で `/(auth)/login` へ遷移） | なし（既存挙動） | Simulator で Secure Store クリアして起動、login 画面表示 |
| 3 | 実機検証: `API_URL=https://walkingdogdev.dpdns.org npx expo run:ios --device` | なし | Unmatched Route が出ず、ログイン or WALK 画面に到達 |

テスト: `apps/mobile/app/` は RN Testing Library でのルート遷移テストを書くのが難しい（expo-router のモックが必要）。`app/index.tsx` は 3 行の Redirect のため、**手動検証で十分**。

## 検証手順（E2E）

### Simulator
```bash
cd apps/mobile
npx expo start --clear
# 別ターミナルで i キー
```
- 認証済み状態: WALK タブが表示される
- ログアウト状態: `(auth)/login` 画面が表示される

### 実機（再現条件）
```bash
cd apps/mobile
API_URL=https://walkingdogdev.dpdns.org npx expo run:ios --device
```
- インストール後、アプリ起動時に Unmatched Route が **出ない** ことを確認
- 認証状態に応じて login or WALK 画面が表示される

## 変更ファイル

- **新規**: `apps/mobile/app/index.tsx`（~5行）

## 参照

- PR #80 コミット: `676214b feat(mobile): merge HOME tab into WALK tab`
- `apps/mobile/app/_layout.tsx:48-50` — `unstable_settings.anchor='(tabs)'`
- `apps/mobile/app/(tabs)/_layout.tsx:13` — `initialRouteName="walk"`
- `apps/mobile/app.config.ts:15` — `scheme: 'walking-dog'`
- Expo Router docs: https://docs.expo.dev/router/reference/redirects/
