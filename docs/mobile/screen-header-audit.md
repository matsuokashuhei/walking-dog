# 画面ベース部分の共通化 — 改善点の洗い出し / Screen header unification — improvement audit

> **Status: Historical (Pre-PR #230 planning record).**
> This document describes the screen-header inconsistencies that existed
> **before** PR #230 "Unify mobile screen headers" was merged. The "現状"
> tables capture the codebase state at the time of the audit. For the
> shipped component, see [screen-header-interface.md](screen-header-interface.md)
> and `apps/mobile/components/ui/ScreenHeader.tsx`.

## Context / 背景

`apps/mobile` の各画面で「最上部の両端ボタン（Cancel / + Add / ‹ Back / Save）」と「その下の画面タイトル」が画面ごとに別実装になっている。とくに **My Dog（Dogs 一覧タブ）** と **Me（Settings タブ）** で同じはずのヘッダー構造が揃っていない。

ユーザーは `docs/design.html` を基準に共通化したいと考えており、今回のスコープは「**改善点の洗い出し**」まで。実装は別ステップで行う。

`docs/design.html` は Babel で実行される単一 HTML プロトタイプで、内部で `NavBar` という共通プリミティブを定義し、すべての画面で同じ関数を呼んでいる。**設計上は共通化済み**だが、それが React Native 側に取り込まれていない、というのが問題の本質。

## design.html が定義する正解仕様 / Design source of truth

`docs/design.html` 内の `NavBar({ title, left, right, c, large = true })`（decoded line 1088 相当）：

| variant | 構造 | 行1 (top:54, h:44) | 行2 | 例 |
|---|---|---|---|---|
| **large** (ルートタブ画面) | 2段 | `[left 17px tint, minWidth:60]` ⟷ `[right 17px tint, minWidth:60]` | `title 34/700/-0.6, padding 6/0/10/0` | `<NavBar title="Dogs" right="+ Add" />`, `<NavBar title="Me" />` |
| **modal** (Add Dog / Edit dog / Edit profile) | 1段 | `Cancel 17 tint` — `title 17 600 center` — `Save 17 tint 600` | — | Edit dog / Edit profile |
| **inline** (Stack push 画面 / Sign Up 風) | 1段 | `‹ Back 17 tint` left のみ | — | Sign Up |

**ポイント**: large variant では、右ボタンが無くても上段の枠（`minWidth:60`）は確保される → タイトル行の高さ・左寄せ位置が**右ボタン有無に関わらず常に揃う**。

座標は [apps/mobile/theme/tokens.ts](apps/mobile/theme/tokens.ts) の `layout` トークンと完全一致：
- `statusBar: 54` / `navBar: 44` / `largeTitleBlock: 52` / `safeTop: 54`

## 現状の実装サマリー / Current state per screen

| 画面 | 実装場所 | 左ボタン | 右ボタン | タイトル表示 | design 仕様との差分 |
|---|---|---|---|---|---|
| **Dogs (My Dog) 一覧** | [apps/mobile/app/(tabs)/dogs.tsx:22](apps/mobile/app/(tabs)/dogs.tsx) | — | `+ Add`（タイトル**と同じ行**） | FlatList の `ListHeaderComponent` 内に `largeTitle` | **+ Add が上段ではなく largeTitle と同行**。design 仕様（上段 right）と構造が違う。共通コンポーネント未使用 |
| **Me (Settings) タブ** | [apps/mobile/app/(tabs)/settings.tsx:26](apps/mobile/app/(tabs)/settings.tsx) | — | — | ScrollView 直下に `largeTitle` | **上段の枠そのものが存在しない**。Dogs と比較するとタイトル行の高さ・上余白が違って見える |
| **Walk タブ** | [apps/mobile/app/(tabs)/walk.tsx](apps/mobile/app/(tabs)/walk.tsx) | — | — | （タイトル文字列なし） | **タイトル無し**。design.html では `<NavBar title="Walk" />` 想定 |
| **New Dog (Add Dog)** | [apps/mobile/app/dogs/new.tsx:54](apps/mobile/app/dogs/new.tsx) | `Cancel`（自前 Pressable） | `Save`（自前 Pressable） | `headline 17/600` 中央 | 仕様一致だが**自前 navBar の重複実装** |
| **Edit Dog** | [apps/mobile/app/dogs/[id]/edit.tsx:78](apps/mobile/app/dogs/[id]/edit.tsx) | `Cancel` | `Save` | `headline 17/600` 中央 | new.tsx と**完全に同じコードが二重定義** |
| **Dog Detail** | [apps/mobile/app/dogs/[id]/index.tsx](apps/mobile/app/dogs/[id]/index.tsx) + [DogHeroNavBar.tsx](apps/mobile/components/dogs/DogHeroNavBar.tsx) | カスタム Back | 条件付き Edit | Hero 画像オーバーレイ | 画面固有の特殊ヘッダー。共通化対象外として扱う |

## 識別された改善点 / Improvement points

### 主要不揃い（ユーザー指摘）

1. **Dogs 一覧の `+ Add` 位置がデザインと違う**
   - 現状: largeTitle と同じ行に並列（[dogs.tsx](apps/mobile/app/(tabs)/dogs.tsx) の `titleRow` style）
   - 正解: 上段 row1 の右側、`+ Add 17px tint, minWidth:60`
   - 影響: 上段の高さが Me と揃わず、タイトル行ベースラインがズレる

2. **Me に上段（ボタン枠）が無い**
   - 現状: 直接 largeTitle がトップに来る
   - 正解: 右/左ともボタン無しでも、上段 44px の空枠を確保 → Dogs と同じ縦位置で largeTitle が描画される
   - これが「My Dog 画面と Me 画面で揃っていない」感の根本原因

3. **共通プリミティブが無い**
   - design.html の `NavBar` に相当するコンポーネントが React Native 側に未存在
   - 結果として Dogs / Me / new / edit がそれぞれ独立に書かれる
   - `components/ui/` 配下に共通ヘッダーコンポーネントを新設すべき

### 副次的不揃い

4. **New Dog と Edit Dog のヘッダーコードが二重定義**（[new.tsx](apps/mobile/app/dogs/new.tsx) と [edit.tsx](apps/mobile/app/dogs/[id]/edit.tsx) がほぼ同一）
5. **Walk タブにタイトルが無い**（design.html では `Walk` のタイトルが入っている）
6. **iOS large title の scroll-collapse 動作を捨てている**（自前実装のためスクロール時に縮小・消滅しない）— ただし design.html は常時 large title 表示なので、これは**意図通り**として現状維持で OK
7. **Stack ヘッダーが画面によって on/off 混在**（[app/_layout.tsx](apps/mobile/app/_layout.tsx) で全 group が `headerShown: false`、子 layout で再有効化）→ 共通コンポーネントに統一すれば整理できる

## 統一方針（推奨） / Recommended unification strategy

**共通コンポーネント `ScreenHeader` を `apps/mobile/components/ui/` に新設し、全画面でこれだけを使う。**

設計イメージ（実装フェーズで確定）：

```tsx
interface ScreenHeaderProps {
  title: string;
  variant?: 'large' | 'modal' | 'inline';   // default: 'large'
  leftAction?: { label: string; onPress: () => void } | 'back' | null;
  rightAction?: { label: string; onPress: () => void; strong?: boolean; disabled?: boolean } | null;
}
```

- **layout/typography トークンを使う**: `layout.navBar`, `typography.largeTitle`, `typography.headline`, `typography.body`, `spacing.md`（既存トークンで充足）
- **上段は常に minWidth:60 のプレースホルダを左右に確保**（design.html と同じ）→ 右ボタン無しでも縦位置が固定
- **`SafeAreaView edges={['top']}` を内部に取り込む**か、外側のレイアウト規約として残すかは実装フェーズで決定
- **Stack header と共存しない**: 全画面 `headerShown: false` に揃え、ScreenHeader を body の先頭に置く（[app/_layout.tsx](apps/mobile/app/_layout.tsx) で全 group が `headerShown: false` のためルートはほぼそのまま）

### 採用後の各画面の使い方（イメージ）

| 画面 | 使い方 |
|---|---|
| Dogs | `<ScreenHeader title={t('dogs.list.title')} rightAction={{ label: t('dogs.list.addCta'), onPress: addDog }} />` |
| Me | `<ScreenHeader title={t('settings.title')} />` |
| Walk | `<ScreenHeader title={t('tabs.walk')} />` |
| New Dog | `<ScreenHeader variant="modal" title={t('dogs.new.title')} leftAction={{ label: t('dogs.action.cancel'), onPress: back }} rightAction={{ label: t('dogs.action.save'), onPress: save, strong: true, disabled: !canSave }} />` |
| Edit Dog | 同上（title だけ `dogs.edit.title`） |
| Dog Detail | Hero 専用ヘッダー（DogHeroNavBar）はそのまま。将来「Hero variant」を ScreenHeader に取り込む選択肢は残す |

### 棄却した代替案

- **Stack の `headerLargeTitle` に寄せる案**: native の縮小アニメは魅力的だが、Android で挙動が違い、design.html の「常時 large title」とも噛み合わない。`headerLeft / headerRight` のスタイルも JSX で各画面に書くため重複削減効果が薄い。

## 影響ファイル / Files in scope

実装フェーズで触る予定のファイル（今回の plan では編集しない）：

- **新規**: `apps/mobile/components/ui/ScreenHeader.tsx`（+ テスト）
- **更新**: 
  - [apps/mobile/app/(tabs)/dogs.tsx](apps/mobile/app/(tabs)/dogs.tsx) — `titleRow` を ScreenHeader に置き換え
  - [apps/mobile/app/(tabs)/settings.tsx](apps/mobile/app/(tabs)/settings.tsx) — `heroTitle` を ScreenHeader に置き換え
  - [apps/mobile/app/(tabs)/walk.tsx](apps/mobile/app/(tabs)/walk.tsx) — ScreenHeader を追加
  - [apps/mobile/app/dogs/new.tsx](apps/mobile/app/dogs/new.tsx) — 自前 navBar 削除、ScreenHeader 採用
  - [apps/mobile/app/dogs/[id]/edit.tsx](apps/mobile/app/dogs/[id]/edit.tsx) — 同上
  - [apps/mobile/app/dogs/[id]/_layout.tsx](apps/mobile/app/dogs/[id]/_layout.tsx) — Stack のヘッダーは Index と Edit の 2 画面分のみで、それぞれ子画面側に `ScreenHeader variant="inline"` を持つ
- **参照のみ**: [apps/mobile/theme/tokens.ts](apps/mobile/theme/tokens.ts)（既存 `layout.*` / `typography.*` をそのまま利用）

## 検証 / Verification

実装後の検証（今回のスコープ外、参考メモ）：

- iOS Simulator で Dogs ⇄ Me ⇄ Walk タブを切り替え、**largeTitle の Y 座標が完全に一致**することを目視確認（タブ切替時の上下ブレが無い）
- New Dog / Edit Dog のモーダル ヘッダーが同じ高さ・同じフォントで表示されることを確認
- Dog Detail から Edit に push 遷移したとき、ヘッダーが Stack 標準ではなく `ScreenHeader variant="inline"` で統一されることを確認
- Dark mode / Light mode 両方で色トークンが正しく適用されることを確認
- `apps/mobile/components/ui/ScreenHeader.test.tsx` を追加し、3つの variant それぞれで a11y label と minimum touch target (44pt) が満たされることをテスト
- `npm run typecheck && npm run lint` (Docker 経由) が通ること

## 次のアクション / Next step for the user

このプランでは「**改善点の洗い出し**」までを完了した。次は：

1. この洗い出し内容で合意できれば、続いて `ScreenHeader` コンポーネントの **インターフェース設計** に進む（variant 名・プロパティ形状・back ボタンの label を i18n でどう扱うか等）
2. その後、共通コンポーネント実装 → 各画面の置き換え → 視覚確認、の順で進める（各ステップで PR を分けるのが安全）
