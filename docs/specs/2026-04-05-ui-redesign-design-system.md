# Spec: UIリデザイン & デザインシステム構築

## Why

現在のアプリはブランドイメージが確立されていない。機能は動いているが、アプリとしての個性・一貫したビジュアルアイデンティティがない。リデザインの目的は機能追加ではなく、**「このアプリを使う体験」に一貫性と信頼感を与えること**。

## ブランド方針

**Notion スタイル** — Clean, editorial, spacious。

- 色ではなく **スペース・タイポグラフィ・比率** でブランドを表現する
- アクセントカラーは使わない。モノクロのみ
- 「楽しい」「犬らしい」はイラストやコピーで表現し、UIの色使いには持ち込まない
- ライトモード・ダークモードの両対応（前提条件）

## 完成の定義（スコープ）

以下の3つがすべて揃ったとき「完成」とする：

1. **トークン定義** — 色・余白・角丸・タイポグラフィのすべてが `tokens.ts` に定義されている
2. **共通コンポーネント** — 基本UIパーツ（Button、Card、TextInput など）がトークンを使って実装されている
3. **全画面準拠** — 既存の全画面がデザインシステムを使って再実装されている

## デザイントークン設計

### カラー（モノクロ、ライト/ダーク対応）

```ts
// theme/tokens.ts に追加
export const colors = {
  light: {
    background:    '#FFFFFF',
    surface:       '#F7F7F7',  // カード背景など
    border:        '#E5E5E5',
    text:          '#1A1A1A',
    textSecondary: '#6B6B6B',
    textDisabled:  '#ADADAD',
    interactive:   '#1A1A1A',  // ボタン・リンクのアクティブ色
    overlay:       'rgba(0,0,0,0.4)',
  },
  dark: {
    background:    '#111111',
    surface:       '#1E1E1E',
    border:        '#2E2E2E',
    text:          '#F0F0F0',
    textSecondary: '#9A9A9A',
    textDisabled:  '#5A5A5A',
    interactive:   '#F0F0F0',
    overlay:       'rgba(0,0,0,0.6)',
  },
} as const;
```

### スペーシング（既存を維持）

```ts
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }
```

### 角丸（既存を維持）

```ts
export const radius = { sm: 6, md: 12, lg: 16, full: 9999 }
```

### タイポグラフィ（既存を維持・拡張可）

```ts
export const typography = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
}
```

## 共通コンポーネント（最低限）

| コンポーネント | 説明 |
|--------------|------|
| `Button` | primary / secondary / ghost バリアント |
| `Card` | surface 背景 + border + radius |
| `TextInput` | border スタイル、フォーカス状態 |
| `ThemedText` | h1/h2/body/caption などのプリセット |
| `ThemedView` | background/surface の切り替え |
| `Divider` | border カラーを使った区切り線 |

実装パターンは既存の `components/themed-text.tsx` / `themed-view.tsx` を踏台にする。

## 実装アプローチ

**全面一括更新**（新しい feature ブランチで作業）。段階的な移行はしない。

1. `tokens.ts` にカラートークンを追加
2. `useThemedStyles` フックでカラーを参照できることを確認
3. 共通コンポーネントを実装（既存の `components/` 以下に配置）
4. 各画面を共通コンポーネント + トークン使いに置き換える

対象画面：
- `(tabs)/index.tsx` — ホーム
- `(tabs)/dogs.tsx` — 犬一覧
- `(tabs)/walk.tsx` — 散歩
- `(tabs)/settings.tsx` — 設定
- `dogs/` 以下 — 犬詳細など
- `walks/` 以下 — 散歩詳細など
- `(auth)/` 以下 — 認証画面

## 非ゴール

- Figmaとのトークン連携（将来検討）
- アニメーション・マイクロインタラクションの刷新（別フェーズ）
- アクセントカラーの追加（このリデザインでは導入しない）
- コンポーネントのnpmパッケージ化（自分一人のコードベースのみ）

## オープンクエスチョン

- `System font` のまま進めるか、カスタムフォント（例: Inter）を導入するか — タイポグラフィの印象を大きく左右する
- `expo-image` のプレースホルダー・skeleton のスタイルはシステムに含めるか

## 受け入れ基準

- [ ] `tokens.ts` に `colors.light` と `colors.dark` が定義されている
- [ ] `useThemedStyles` がカラートークンを参照している
- [ ] `Button`・`Card`・`TextInput`・`ThemedText`・`ThemedView` が実装されている
- [ ] 全タブ画面・サブ画面がトークンと共通コンポーネントを使って書き直されている
- [ ] ライトモード・ダークモードの切り替えで全画面が正しく表示される
- [ ] マジックナンバー（直書きの `#FFFFFF` や `16` など）がプロダクションコードに残っていない
