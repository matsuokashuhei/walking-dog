# UI デザイン刷新計画: The Editorial Archive

## Context

現在のモバイルアプリは基本的な Material Design 風のモノクロームテーマを持っているが、デザインドキュメント `docs/design/` で提案された **"The Editorial Archive"** デザインシステムの美学（金融端末・建築ジャーナル風の高級感、データ重視の生産性ツール）には達していない。

また、テーマシステムに以下の技術的課題がある:
- **レガシーテーマ分裂**: 37ファイルが `constants/theme.ts` (Colors) を使用、4ファイルだけが `theme/tokens.ts` を直接使用
- **useColorScheme バグ**: `use-themed-styles.ts`、`Card.tsx`、`Divider.tsx`、`ThemedView.tsx`、`themed-text.tsx` が `react-native` の `useColorScheme` を直接インポートしており、ユーザーの手動テーマ切替が無視される
- **未使用コード**: `useThemedStyles` フックが定義されているが誰も使っていない。`themed-view.tsx` (レガシー) もインポートされていない

**目標**: デザインシステムの統一、レガシーテーマの完全除去、Editorial Archive ビジュアル言語の全画面適用。

---

## デザイン原則 (docs/design/k9_protocol/DESIGN.md より)

1. **厳格なグレースケール** — エラー赤 (#ba1a1a) 以外のカラーアクセント禁止
2. **No-Line Rule** — 1px 線でセクション区切りしない。背景色シフトで区別
3. **Ghost Border** — outline-variant (#c6c6c6) を 20-40% opacity で使用
4. **Tonal Layering** — ドロップシャドウなし。背景色の段階で深度を表現
5. **Display Typography** — ヒーローセクションに text-5xl〜9xl の font-black (900)、tracking-tighter
6. **Uppercase Labels** — ラベルは ALL-CAPS、letter-spacing +0.05em

---

## Phase 1: Foundation — トークン・フック基盤 (3ファイル)

画面には触れず、新しいシステムを安全に用意する。

### 1.1 `apps/mobile/theme/tokens.ts` — トークン拡張

**Colors に追加** (light/dark 両方):
- `surfaceContainerLowest`: `'#ffffff'` / `'#1a1a1a'` — カード・入力フィールド背景
- `primaryContainer`: `'#3c3b3b'` / `'#d4d4d4'` — ボタングラデーション用

**ColorTokens interface** に上記2つを追加。

**radius を設計に合わせて修正**:
```
sm: 4    (was 6)  — デザイン DEFAULT
md: 8    (was 12) — デザイン lg
lg: 12   (was 16) — デザイン xl、ほとんどのコンポーネント
```

**typography 拡張**:
```
display: { fontSize: 48, fontWeight: '900', lineHeight: 52, letterSpacing: -0.96 }
h1: fontWeight を '700' → '900' に変更、letterSpacing: -0.64 追加
label: textTransform: 'uppercase' 追加（既存の letterSpacing: 0.8 はそのまま）
```

### 1.2 `apps/mobile/hooks/use-themed-styles.ts` — バグ修正

- `import { useColorScheme } from 'react-native'` → `import { useColorScheme } from '@/hooks/use-color-scheme'`
- `StyleSheet` は `react-native` から引き続きインポート
- `useMemo` の依存配列から `factory` を除去（毎レンダーで新しいクロージャが作られるため不要な再計算が発生）

### 1.3 `apps/mobile/hooks/use-colors.ts` — 新規ヘルパーフック

```typescript
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, type ColorTokens } from '@/theme/tokens';

export function useColors(): ColorTokens {
  const colorScheme = useColorScheme();
  return colors[colorScheme ?? 'light'];
}
```

レガシー `Colors[colorScheme ?? 'light']` パターンの直接置換。

### Phase 1 検証
- アプリが起動すること
- Settings でテーマ切替 → useThemedStyles 経由のコンポーネントに反映されること

---

## Phase 2: UI コンポーネント移行 (12ファイル)

全 `components/ui/` + `themed-text.tsx` をレガシー Colors → tokens.ts に移行し、Editorial Archive スタイルを適用。

### 共通変更パターン
- `import { Colors } from '@/constants/theme'` → `import { useColors } from '@/hooks/use-colors'` または tokens 直接
- `import { useColorScheme } from 'react-native'` → `import { useColorScheme } from '@/hooks/use-color-scheme'`
- ドロップシャドウ全削除
- `borderRadius` → `radius.lg` (12px) に統一

### 個別変更

| ファイル | 主な変更 |
|---------|---------|
| `Button.tsx` | useColorScheme 修正、borderRadius → radius.lg |
| `Card.tsx` | useColorScheme 修正、bg → surfaceContainerLowest |
| `TextInput.tsx` | Colors → useColors、bg → surfaceContainerLowest、label に typography.label 適用 |
| `ThemedView.tsx` | useColorScheme 修正、surfaceContainerLowest を surface prop に追加 |
| `Divider.tsx` | useColorScheme 修正、1px 線 → spacing による余白区切りに変更 (No-Line Rule) |
| `EmptyState.tsx` | Colors → useColors |
| `SegmentedControl.tsx` | Colors → useColors、shadow 削除、tonal layering に変更 |
| `LoadingScreen.tsx` | Colors → useColors |
| `ConfirmDialog.tsx` | Colors → useColors、bg → surfaceContainerLowest、shadow 削除 |
| `ErrorScreen.tsx` | Colors → useColors |
| `themed-text.tsx` | useColorScheme 修正、display variant 追加、label に uppercase 自動適用 |

### レガシー削除
- `components/themed-view.tsx` — 使用箇所ゼロ → **削除**

### Phase 2 検証
- `grep -r "constants/theme" apps/mobile/components/` → 0件
- 全 UI コンポーネントが light/dark で正しく表示
- Ghost border が subtle に見える、shadow なし

---

## Phase 3: Auth 画面 (5ファイル)

### 変更ファイル
| ファイル | 主な変更 |
|---------|---------|
| `components/auth/LoginForm.tsx` | Colors → useColors、エラー表示に error トークン |
| `components/auth/RegisterForm.tsx` | Colors → useColors |
| `components/auth/ConfirmForm.tsx` | Colors → useColors、6桁個別コードボックス (verification_code デザイン準拠) |
| `app/(auth)/login.tsx` | Colors → useColors、"Welcome back" display typography、左寄せエディトリアルレイアウト |
| `app/(auth)/register.tsx` | Colors → useColors、"WALKING DOG" uppercase ブランディング、"Create Account" display typography |

### Phase 3 検証
- サインイン・サインアップ・認証コード画面がデザインモックアップに近い
- 認証フロー（登録→認証コード→ログイン）が正常動作

---

## Phase 4: Tab 画面 (10ファイル)

### 4.1 Tab Bar
**`app/(tabs)/_layout.tsx`**: Colors → useColors、アクティブタブ = 黒ピル背景 + 白テキスト/アイコン

### 4.2 Home (Dashboard)
**`app/(tabs)/index.tsx`**: "Ready for the morning run?" display typography、大きな "Start Walk →" CTA、dog リスト with 丸アバター・ステータスバッジ

### 4.3 Walk
**`app/(tabs)/walk.tsx`** + サブコンポーネント:
| ファイル | 変更 |
|---------|------|
| `components/walk/WalkControls.tsx` | タイマー display typography ("24:15")、"DURATION" uppercase、Pause (outlined) / Finish (filled) |
| `components/walk/WalkMap.tsx` | モノクロームコンテナ、ghost border、radius.lg |
| `components/walk/DogSelector.tsx` | Colors → useColors |
| `components/walk/WalkSummaryCard.tsx` | Colors → useColors、editorial カードレイアウト |

### 4.4 Dogs
**`app/(tabs)/dogs.tsx`** + サブコンポーネント:
| ファイル | 変更 |
|---------|------|
| `components/dogs/DogListItem.tsx` | 白背景カード、ghost border、丸アバター、chevron |
| `components/dogs/DogStatsCard.tsx` | bento スタイル: 登録数 + 最後の散歩 (inverted black) |

### 4.5 Settings
**`app/(tabs)/settings.tsx`** + サブコンポーネント:
| ファイル | 変更 |
|---------|------|
| `components/settings/ProfileSection.tsx` | セクションラベル uppercase |
| `components/settings/DogListSection.tsx` | 同上 |
| `components/settings/AppearanceSection.tsx` | 同上 |
| `components/settings/LogoutButton.tsx` | outlined スタイル |

### Phase 4 検証
- 4つの tab 画面がデザインモックアップに近い
- タブバーのアクティブ状態がピルスタイル
- 散歩記録フローが正常動作 (select dogs → start → record → stop → summary)

---

## Phase 5: Detail 画面 (8ファイル)

| ファイル | 主な変更 |
|---------|---------|
| `app/dogs/[id]/index.tsx` | 犬名 display typography、データテーブル (uppercase ラベル)、写真エディトリアル配置 |
| `app/dogs/[id]/edit.tsx` | Colors → useColors |
| `app/dogs/[id]/members.tsx` | Colors → useColors |
| `app/dogs/[id]/_layout.tsx` | Colors → useColors |
| `app/dogs/new.tsx` | Colors → useColors |
| `app/walks/[id].tsx` | Colors → useColors、モノクロームマップ、editorial 統計カード |
| `app/walks/_layout.tsx` | Colors → useColors |
| `app/invite/[token].tsx` | Colors → useColors、centered レイアウト、"You're invited!" h2、"Accept Invitation" 黒 CTA |

### Phase 5 検証
- 全 detail 画面がデザインに近い
- 犬の編集・作成・メンバー管理が正常動作
- 招待受諾フローが正常動作

---

## Phase 6: クリーンアップ (5ファイル)

### 6.1 レガシーファイル削除
- **削除**: `apps/mobile/constants/theme.ts`
- **削除**: `apps/mobile/hooks/use-theme-color.ts` (使用箇所: themed-view.tsx のみ → Phase 2 で削除済)

### 6.2 Root Layout 更新
- `app/_layout.tsx`: ナビゲーションテーマオブジェクトを tokens ベースに統一

### 6.3 テスト更新
- `@/constants/theme` の mock を `@/theme/tokens` に更新
- 影響テストファイル: LoginForm.test.tsx, RegisterForm.test.tsx, DogForm.test.tsx, DogListItem.test.tsx, DogMembersList.test.tsx, WalkHistoryItem.test.tsx

### Phase 6 検証
- `grep -r "constants/theme" apps/mobile/` → 0件
- `grep -r "use-theme-color" apps/mobile/` → 0件
- 全テスト pass
- フルスモークテスト: auth → home → walk → dogs → settings → dog detail → invite

---

## ファイル総数

| 種類 | 数 |
|-----|---|
| 新規作成 | 1 (use-colors.ts) |
| 修正 | ~45 |
| 削除 | 3 (constants/theme.ts, use-theme-color.ts, themed-view.tsx) |

## PR 戦略

| PR | Phase | ファイル数 | 内容 |
|----|-------|----------|------|
| 1 | 1 + 2 | ~16 | Foundation: トークン、フック、UI コンポーネント |
| 2 | 3 | ~5 | Auth 画面リデザイン |
| 3 | 4 | ~10 | Tab 画面 + サブコンポーネント |
| 4 | 5 | ~8 | Detail 画面 |
| 5 | 6 | ~8 | クリーンアップ、レガシー削除、テスト更新 |

## 成功基準

- [ ] `@/constants/theme` のインポートがゼロ
- [ ] `useColorScheme` の `react-native` 直接インポートが `hooks/use-color-scheme.ts` のみ
- [ ] 全画面で Editorial Archive ビジュアル (グレースケール、no divider lines、tonal layering)
- [ ] ヒーローセクションに display typography
- [ ] ラベルが uppercase + letter-spacing
- [ ] カードに ghost border (20-40% opacity)
- [ ] ドロップシャドウなし
- [ ] Light/Dark 両モード正常動作
- [ ] Settings のテーマ切替が全画面に反映
- [ ] 全既存テスト pass
- [ ] 全既存機能が同一動作 (auth, walk, dog CRUD, invite)
