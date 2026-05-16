# `ScreenHeader` — Interface Design / インターフェース設計

## Context / 背景

[screen-header-audit.md](screen-header-audit.md) で洗い出した不揃いを解消するため、`apps/mobile/components/ui/ScreenHeader.tsx` という共通プリミティブを新設した。本ドキュメントは PR #230 で shipped された **インターフェース設計（API 形と命名の確定）** の記録として扱う。

## 1. Variant の決定 / Variant decisions

**結論: 2 つの variant に集約する。`largeTitle` (default) と `inline` の 2 つ。**

| variant | 用途 | 構造 | 例 |
|---|---|---|---|
| `largeTitle` (default) | ルートタブ画面 (Dogs / Me / Walk) | 行1: 左/右ボタンの44px枠（**ボタン無しでも常に予約**）／ 行2: 34/700 large title 左寄せ | Dogs, Me, Walk |
| `inline` | push 画面・modal 画面 | 1行: 左ボタン — 中央タイトル 17/600 — 右ボタン | New Dog (modal), Edit Dog (modal), Members, Encounters, Friends |

### Rationale / 設計判断

- 当初案の3 variant (large/modal/inline) を検討したが、`modal` は `inline` + `leftAction=cancel` + `rightAction=save (strong)` で完全に表現できるため**冗長**
- variant を「視覚的レイアウトの違い」に絞ることで直交性が上がり、ユースケース（push vs modal）の判断はコンポーネント外（呼び出し側の `presentation:` 等）に任せられる
- iOS HIG の `largeTitleDisplayMode = .always | .never` の二分法とも一致

### 棄却した代替

- **3 variant 案**: `modal` を専用 variant にすると caller が「これは modal だから modal variant」とコンテキストを保ったまま記述できる利点はあるが、`inline` との内部実装の重複が大きく保守コストが見合わない
- **scroll-collapse 対応 variant**: iOS native の large title 縮小は魅力的だが、design.html は常時表示前提・Android では挙動が異なるため対象外（将来拡張）

---

## 2. TypeScript インターフェース / Interface

```ts
// apps/mobile/components/ui/ScreenHeader.tsx

/**
 * 画面最上部のナビゲーションバー兼タイトル領域。
 * design.html の `NavBar` プリミティブを RN 化したもの。
 */
export interface ScreenHeaderProps {
  /** 表示タイトル。i18n 済みの文字列を渡す。 */
  title: string;

  /**
   * レイアウト variant。
   * - `largeTitle` (default): 2行構造、行2に 34px の大見出し。ルートタブ画面向け。
   * - `inline`: 1行構造、中央 17/600 のタイトル。push / modal 画面向け。
   */
  variant?: 'largeTitle' | 'inline';

  /**
   * 左側のアクション。
   * - undefined / 省略: 左ボタン無し（ただし上段枠は予約される）
   * - `'back'`: 共通 back ショートカット。chevron + `common.action.back` で
   *   `router.back()` を呼ぶ。
   * - object: 任意のラベルとハンドラを指定。
   */
  leftAction?: ScreenHeaderAction | 'back';

  /**
   * 右側のアクション。
   * - undefined / 省略: 右ボタン無し（ただし上段枠は予約される）
   * - object: 任意のラベルとハンドラを指定。
   *   `strong: true` で fontWeight 600 になる（Save 等の主要 CTA 想定）。
   */
  rightAction?: ScreenHeaderAction;

  /** テスト・E2E 用 ID。ScreenHeader 自体の View に付与される。 */
  testID?: string;
}

export interface ScreenHeaderAction {
  /** ボタンのラベル。アクセシビリティラベルも兼ねる。 */
  label: string;
  /** タップハンドラ。 */
  onPress: () => void;
  /** true なら fontWeight 600（Save 等の primary CTA 用）。default: false */
  strong?: boolean;
  /** true なら無効化表示（textDisabled 色 + accessibilityState.disabled）。 */
  disabled?: boolean;
}
```

### Prop 設計の根拠 / Rationale per prop

| prop | 設計判断 | 採用理由 |
|---|---|---|
| `title: string` | 必須・文字列のみ（ReactNode 不可） | design.html ですべて文字列。柔軟性を捨てて API を狭く保つ |
| `variant` | union 2 値 / default `'largeTitle'` | 利用頻度の高い root tab を default に。文字列リテラル union は既存 `Button.tsx` の `variant` 流儀と一致 |
| `leftAction` | union: object \| `'back'`、省略で action 無し | `'back'` は出現頻度が高いショートカット。i18n と `router.back()` を内包 |
| `rightAction` | union: object、省略で action 無し（`'back'` 等のショートカット無し） | 右側は文脈依存（Save / +Add / Done など多様）でショートカット定義の意味が薄い |
| `strong` on rightAction | boolean | design.html では Save のみ fontWeight 600。「右側は強調可能」というセマンティクスを直接表す |
| `disabled` on rightAction | boolean | フォーム未入力時の Save 無効化に必須 |
| **SafeAreaView は内包しない** | 呼び出し側が引き続き `SafeAreaView edges={['top']}` でラップ | 既存 6 画面がすべてそうしている。内包すると padding 重複や入れ子のリスク |
| **Stack header は使わない** | 全画面 `headerShown: false` 前提 | [app/_layout.tsx](apps/mobile/app/_layout.tsx) と整合。Stack の `headerLeft / headerRight` と二重実装にしない |

### 棄却した API 案

- **`backShorthand?: boolean` プロパティ**: `leftAction='back'` のほうが「左にこれを置く」という意図と一致して読みやすい
- **`actions: { left?, right? }` ネスト**: 一段深くなるだけで読みづらくなる。フラットな `leftAction` / `rightAction` のほうが型推論的にも素直
- **`onLeftPress` / `leftLabel` の分割 prop**: ラベルとハンドラが別 prop だと「片方だけ渡したらどうなるか」が曖昧。object にまとめることで揃って渡る前提を型で強制できる

---

## 3. 使用例（全画面） / Usage examples

```tsx
// (tabs)/dogs.tsx — Dogs (My Dog) 一覧
<ScreenHeader
  title={t('dogs.list.title')}
  rightAction={{ label: t('dogs.list.addCta'), onPress: vm.handleAddDog }}
/>

// (tabs)/settings.tsx — Me
<ScreenHeader title={t('settings.title')} />

// (tabs)/walk.tsx — Walk
<ScreenHeader title={t('tabs.walk')} />

// dogs/new.tsx — New Dog (modal)
<ScreenHeader
  variant="inline"
  title={t('dogs.new.title')}
  leftAction={{ label: t('common.action.cancel'), onPress: () => router.back() }}
  rightAction={{
    label: t('common.action.save'),
    onPress: handleSave,
    strong: true,
    disabled: !canSave,
  }}
/>

// dogs/[id]/edit.tsx — Edit Dog (modal) — new.tsx と同じパターン
<ScreenHeader
  variant="inline"
  title={t('dogs.edit.title')}
  leftAction={{ label: t('common.action.cancel'), onPress: () => router.back() }}
  rightAction={{ label: t('common.action.save'), onPress: handleSave, strong: true, disabled: !canSave }}
/>

// dogs/[id]/members.tsx — Members (Stack push)
<ScreenHeader variant="inline" title={t('dogs.members.title')} leftAction="back" />

// dogs/[id]/encounters.tsx — Encounter History
<ScreenHeader variant="inline" title={t('dogs.encounters.title')} leftAction="back" />

// dogs/[id]/friends/index.tsx — Friends
<ScreenHeader variant="inline" title={t('dogs.friends.title')} leftAction="back" />
```

---

## 4. i18n キー追加 / i18n keys to add

`common` 名前空間に共通アクションを追加する。両ロケールで同期。

```json
// apps/mobile/lib/i18n/locales/en.json
{
  "common": {
    "error": "Error",
    "retry": "Retry",
    "action": {
      "back": "Back",
      "cancel": "Cancel",
      "save": "Save"
    }
  }
}

// apps/mobile/lib/i18n/locales/ja.json
{
  "common": {
    "error": "エラー",
    "retry": "再試行",
    "action": {
      "back": "戻る",
      "cancel": "キャンセル",
      "save": "保存"
    }
  }
}
```

### 既存キーの扱い

| 既存キー | 扱い | 理由 |
|---|---|---|
| `dogs.action.cancel` / `dogs.action.save` | **削除して `common.action.*` に統合** | dog 限定の文言ではない。共通化が自然 |
| `auth.signup.back` | 既存のまま保持（auth フロー固有の文脈） | 今回のリファクタ範囲外 |
| `dogs.detail.back: "Dogs"` | 既存のまま保持 | Dog 詳細から戻るときに敢えて「Dogs」と表示している文脈。`leftAction={{ label: t('dogs.detail.back'), onPress: () => router.back() }}` でオーバーライド使用 |

---

## 5. アクセシビリティ / Accessibility

ScreenHeader は内部で以下を担保する：

- 左右の Pressable に `accessibilityRole='button'` と `accessibilityLabel=action.label`
- `rightAction.disabled` のとき `accessibilityState={{ disabled: true }}`
- `hitSlop={12}` で 44pt のタップターゲットを保証（[apps/mobile/.claude/rules/common/accessibility.md](apps/mobile/.claude/rules/common/accessibility.md) 準拠）
- タイトル Text に `accessibilityRole='header'` を付与（VoiceOver のローター対応）

---

## 6. トークン使用マッピング / Token mapping

すべて [apps/mobile/theme/tokens.ts](apps/mobile/theme/tokens.ts) の既存トークンで充足。**新規トークン追加は不要**。

| 役割 | トークン | 値 |
|---|---|---|
| 行1 の高さ | `layout.navBar` | 44 |
| 左右ボタンの minWidth 枠 | `spacing.step60` | 60 |
| 行1/行2 の左右 padding | `spacing.md` | 16 |
| 行2 (largeTitle) のフォント | `typography.largeTitle` | 34/700/-0.6/41 |
| 行2 の縦 padding | top `spacing.step6`(6) + bottom `spacing.step10`(10) | 6 / 10 |
| inline タイトルのフォント | `typography.headline` | 17/600/22 |
| 通常ボタンのフォント | `typography.body` | 17/400/22 |
| strong ボタンの fontWeight | `typography.headline.fontWeight` | '600' |
| 通常テキスト色 | `theme.interactive` (青 tint) | #0a84ff |
| 無効テキスト色 | `theme.textDisabled` | rgba(...0.3) |

---

## 7. 今回 API に**含めない**もの / Out of scope (deferred)

| 機能 | 理由 |
|---|---|
| **scroll-collapse アニメーション** | design.html は常時 large title 表示。Reanimated 連携が必要で複雑度が増す |
| **left/right に複数アクション** | design.html は左右各1つ。現状 UI で必要無し |
| **アイコンのみのアクション** (label 無し) | 当面はテキストラベルで統一 |
| **背景色のカスタマイズ** | テーマで自動。透過 / blur 対応は将来 |
| **タイトル下のサブタイトル** | design.html に該当なし |
| **Hero variant** (Dog Detail の写真オーバーレイ) | [DogHeroNavBar.tsx](apps/mobile/components/dogs/DogHeroNavBar.tsx) は固有需要が強く別コンポーネントのまま |

---

## 8. 決定事項 / Resolved decisions

All open questions raised during interface design were resolved before
implementation. PR #230 ships with:

| # | Decision | Outcome |
|---|---|---|
| 1 | Back button glyph | SF Symbol `chevron.backward` via `icon-symbol`. |
| 2 | `dogs.action.{cancel, save}` removal | Removed in the same PR, replaced by `common.action.{cancel, save}`. |
| 3 | Walk tab title | Added (`title='Walk'`) per design.html. |
| 4 | `leftAction='back'` default label | `t('common.action.back')`. |

---

## 9. Status / 状況

Shipped in PR #230 "Unify mobile screen headers" on branch
`claude/hopeful-lederberg-0d3dcc`. See `apps/mobile/components/ui/ScreenHeader.tsx`
and `apps/mobile/components/ui/ScreenHeader.test.tsx` for the implementation
and test coverage.
