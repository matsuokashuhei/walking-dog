# Plan: 歩行記録画面の下部パネルを Expo 公式 formSheet (iOS 26 Liquid Glass) 化

## User Request (verbatim)

> 「歩行記録画面の下部のフローティングパネルもExpo公式のUIに変えれるか？」

## Context

**なぜこの変更をするか**

前回の NativeTabs 移行（`apps/mobile/app/(tabs)/_layout.tsx`）で iOS 26 Liquid Glass タブバーは公式 API 化できた（コミット未）。

しかし `apps/mobile/app/walk-recording.tsx` の下部フローティングパネル（統計・イベントボタン・Pause/End）は**完全自作**で、React Native の `<View>` + 絶対位置 + 丸角 + 手動 grabber（WalkControls.tsx:226-234）で構成されている。

これを **Expo Router の `formSheet` 公式プレゼンテーション**に置き換えれば：
- iOS 26 で **UIGlassEffect が自動適用**（ネイティブ sheet なので Liquid Glass 対応）
- 手動の grabber・角丸・影が不要になる
- Apple Maps / 純正「フィットネス」「マップ」アプリと同じ挙動（検出・ドラッグ・detent）
- `sheetAllowedDetents` でネイティブに minimized/expanded をドラッグで切替

**トレードオフ**
- 既知の iOS 26 不具合（[react-native-screens #3235](https://github.com/software-mansion/react-native-screens/issues/3235)、[expo #42066](https://github.com/expo/expo/issues/42066)）で formSheet が小さく描画される報告あり → 発生時は detent 数値調整で回避
- ルーティング構造の再編が必要（walk-recording.tsx 単一ファイル → グループ）
- 既存の `isMinimized` ストア状態は detent で置き換え可能（または detent change event と同期）

## Approach

### ルート構造の再編

**Before**: `app/walk-recording.tsx`（単一ファイル）

**After**: `app/walk-recording/` グループ
```
app/walk-recording/
├── _layout.tsx     # Stack 層
├── index.tsx       # 背景 Map + TopChip（push で controls を自動オープン）
└── controls.tsx    # 下部パネル（formSheet プレゼンテーション）
```

- Root `_layout.tsx` の `<Stack.Screen name="walk-recording">` 登録はそのまま（`presentation: 'fullScreenModal'` も維持 → タブバー非表示）
- `(tabs)/walk.tsx` 内の `router.push('/walk-recording')` も変更不要（index.tsx が受ける）

### formSheet 設定（`walk-recording/_layout.tsx` 内）

```tsx
<Stack.Screen
  name="controls"
  options={{
    presentation: 'formSheet',
    sheetAllowedDetents: [0.28, 0.62],   // minimized / expanded の 2 detent
    sheetInitialDetentIndex: 1,          // 初期は expanded
    sheetGrabberVisible: true,           // ネイティブ grabber
    sheetCornerRadius: 24,               // iOS 26 はシステム既定も綺麗
    gestureEnabled: false,               // スワイプで閉じさせない（End Walk 必須）
    headerShown: false,
  }}
/>
```

### 各ファイルの役割

**`walk-recording/index.tsx`**（背景 map、新規）
- `<WalkMap />` + `<WalkTopChip />`
- `useEffect` で `phase === 'recording'` 確認、非ならば `router.back()`
- 初回マウント時に `router.push('/walk-recording/controls')` で sheet 起動
- deep link `action=camera` の転送（現状と同じロジックを保持）

**`walk-recording/controls.tsx`**（新規、formSheet 内容）
- 現行 `walk-recording.tsx` の `WalkControls` / `WalkMinimizedControls` / `WalkEventActions` / `WalkQuickActions` 部分を移植
- handleStop の実装もこちらに集約
- detent change event で `isMinimized` を store に反映（または `isMinimized` 自体を廃止し、detent index で content 切替）

**`walk-recording/_layout.tsx`**（新規）
- `Stack` で index と controls を束ねる

### 既存コンポーネントの変更

- `components/walk/WalkControls.tsx` — 自作 sheet 装飾を削除（`borderRadius`, `borderWidth`, 手動 grabber、`theme.surface` 背景）。formSheet が提供するので不要
- `components/walk/WalkMinimizedControls.tsx` — 同上（pill 背景・border を削除、または detent 0（小）時のみ表示する content に再利用）
- 他コンポーネント（`WalkEventActions`, `WalkQuickActions`, `WalkTopChip`）は変更なし

### `isMinimized` ストア状態の扱い

**推奨**: 残す。ただし setter は detent change event で呼ぶ
```tsx
<Stack.Screen
  name="controls"
  listeners={{
    sheetDetentChanged: (e) => setMinimized(e.data.index === 0),
  }}
/>
```
これで既存の WalkQuickActions/WalkMinimizedControls の表示切替ロジックを保持しつつ、detent はネイティブドラッグで動かせる。

## Files to Modify / Add / Remove

### 追加
- `apps/mobile/app/walk-recording/_layout.tsx`
- `apps/mobile/app/walk-recording/index.tsx`
- `apps/mobile/app/walk-recording/controls.tsx`

### 削除
- `apps/mobile/app/walk-recording.tsx` — フォルダに置き換わる

### 変更
- `apps/mobile/components/walk/WalkControls.tsx` — 自作 sheet 装飾（border, radius, grabber, background）の削除
- `apps/mobile/components/walk/WalkMinimizedControls.tsx` — pill 背景削除（sheet 内に埋まるため）
- 既存テスト（`WalkControls.test.tsx`, `WalkMinimizedControls.test.tsx`）のアサーション調整（削除した style の期待値を更新）

### 変更不要
- `apps/mobile/app/(tabs)/walk.tsx` — `router.push('/walk-recording')` はそのまま有効
- `apps/mobile/app/_layout.tsx` — root Stack 登録は変更なし

## Re-used Utilities

- `useWalkStore`, `useWalkSession`, `useBleSession`, `useEncounterSession` — そのまま（ロジック変更なし）
- `useSafeAreaInsets` — index.tsx の TopChip 配置で使用
- `useTranslation` — ラベル i18n
- SF Symbol / MaterialIcons via existing `IconSymbol` — 変更なし
- `apps/mobile/components/walk/WalkMap.tsx`, `WalkTopChip.tsx`, `WalkEventActions.tsx`, `WalkQuickActions.tsx` — そのまま再利用

## Risks & Open Questions

1. **iOS 26 formSheet 描画バグ**: 報告あり（detent が期待通り表示されない）。発生時は `sheetAllowedDetents` の数値を実機計測して調整。最悪 `fitToContents` でも可
2. **Android での見た目**: Android でも formSheet は動くが、Liquid Glass は iOS 26 専用。Android は Material BottomSheetDialog 相当で描画される
3. **Stack 入れ子**: root → `walk-recording` (fullScreenModal) → 内部 Stack (index + formSheet controls)。この入れ子構成を expo-router が正しくハンドルするか、実機確認要
4. **detent change event**: `sheetDetentChanged` listener が iOS/Android 両方で発火するか確認（types.tsx:60-64 に記述あり）
5. **camera deep link**: index.tsx → controls.tsx への params 受け渡しを正しく実装する必要あり
6. **既存テスト**: `WalkControls.test.tsx` / `WalkMinimizedControls.test.tsx` 内のスタイル・レイアウトアサーションを更新する必要あり
7. **見た目調整**: formSheet 内コンテンツは padding を native sheet のルールに合わせる必要あり（iOS 26 sheet の safe inset を考慮）

## Verification

1. **Type check**: `npx tsc --noEmit` — 新規エラー 0 を確認
2. **Unit test**: `npm test` — 既存 457 件が緑、テスト更新部分も緑
3. **iOS 26.4 Simulator（iPhone 17 Pro）**:
   - 歩行 START → walk-recording/index にマップ表示、controls sheet が下から expanded detent で自動提示
   - **sheet 背景が Liquid Glass**（マップが透けて見える、スクロール/パンで屈折）
   - grabber をドラッグして minimized detent → 小さいサイズでも stats 見える（または minimized pill に切替）
   - End Walk ボタン → sheet 閉じる → map 画面経由で /(tabs)/walk に戻る → Summary 表示
   - Live Activity 「Camera」ボタンタップ → deep link が controls sheet にまで届き撮影フロー起動
4. **iOS 18 / Android**: Liquid Glass は出ないが、通常の formSheet として正常動作（クラッシュなし）
5. **回帰**: 既存の WalkControls/WalkEventActions の個別テスト（pee/poop/photo ボタン、stats 表示）が緑

## Rollback

変更は新規 3 ファイル追加 + 1 ファイル削除 + 2 ファイル微修正（WalkControls 系スタイル）。問題時は：
```bash
git checkout -- apps/mobile/app/walk-recording.tsx apps/mobile/components/walk/WalkControls.tsx apps/mobile/components/walk/WalkMinimizedControls.tsx
rm -rf apps/mobile/app/walk-recording/
```
で復元可能。
