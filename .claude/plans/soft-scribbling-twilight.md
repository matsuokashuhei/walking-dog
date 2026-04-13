# Plan: タブバーのスタイル変更

## Context

現在のタブバーは選択時に背景色が反転する（黒背景＋白アイコン/テキスト）。
ユーザーは反転スタイルをやめ、アイコン/テキストの**濃淡のみ**で選択状態を表現したい。
また、タブラベルを大文字（uppercase）に変更する。

## 変更対象ファイル

- `apps/mobile/app/(tabs)/_layout.tsx` — タブバーのスタイル設定

## 変更内容

### Step 1: import に `typography` を追加

```tsx
import { typography } from '@/theme/tokens';
```

既存の `typography.label` トークン（fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase'）を再利用する。

### Step 2: `screenOptions` を修正

| プロパティ | Before | After |
|---|---|---|
| `tabBarActiveTintColor` | `theme.onInteractive` (白) | `theme.interactive` (黒) |
| `tabBarActiveBackgroundColor` | `theme.interactive` (黒) | **削除** |
| `tabBarLabelStyle` | なし | `typography.label` ベースのスタイル追加 |

最終的な `screenOptions`:

```tsx
screenOptions={{
  tabBarActiveTintColor: theme.interactive,
  tabBarInactiveTintColor: theme.onSurfaceVariant,
  headerShown: false,
  tabBarButton: HapticTab,
  tabBarLabelStyle: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: typography.label.textTransform,
  },
  tabBarStyle: {
    backgroundColor: theme.background,
    borderTopWidth: 0,
  },
}}
```

### ダークモード対応確認

| トークン | Light | Dark | 用途 |
|---|---|---|---|
| `interactive` | `#000000` | `#f0f0f0` | 選択タブ（濃い色） |
| `onSurfaceVariant` | `#474747` | `#adadad` | 非選択タブ（薄い色） |
| `background` | `#fcf9f8` | `#111111` | タブバー背景 |

## 変更しないもの

- `tokens.ts` — 既存トークンで十分
- 各 `Tabs.Screen` — 個別設定は不要
- `HapticTab` — 影響なし

## Verification

1. iOS シミュレータでライトモード確認 — 選択タブは黒アイコン/テキスト、非選択は灰色、背景反転なし
2. ダークモード確認 — 選択タブは白、非選択は中灰色
3. タブラベルが大文字表示（HOME, WALK, DOGS, SETTINGS）
4. タブ切り替え時のハプティックフィードバックが動作すること
