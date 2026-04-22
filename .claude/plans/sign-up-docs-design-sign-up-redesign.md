# Sign Up 画面 Precise リデザイン計画

## Context

`docs/design/sign-up/expect.html.png`（一次ソース `docs/design/app.html:553-590`）と現行 `apps/mobile/app/(auth)/register.tsx` の見た目が乖離。直前の Sign In リデザイン（PR #127 マージ済み）と同じ設計言語で整える。

変更対象は Register 画面の **register ステップのみ**（`step === 'register'`）。Confirm ステップは PR #126 で largeTitle 統一済みなので範囲外。Register → Confirm の 2 ステップフロー自体は変更しない。

## 方針の既定値（Auto mode、Sign In と同一ポリシー）

- **Terms / Privacy Policy**: UI のみ先行。タップで `Alert` 「近日対応予定」（Apple CTA と同パターン）。実 URL や外部ブラウザ呼び出しは別 PR。
- **"You can add your dog's profile on the next step." ヘルパー文言**: 追加するが、実フローは変更しない（confirm 後は login にリダイレクト、という既存挙動維持）。デザインの狙いを i18n 文言で示すに留める。
- **Back ボタン**: `router.back()` を呼ぶ `Pressable`（青 tint の `‹ Back`）を hero 上部に配置。`_layout.tsx` のネイティブヘッダーは触らない（現状 auth stack はヘッダー非表示）。
- **Confirm ステップの見た目**: 現状維持（PR #126 で Precise 化済み）。

## 目標仕様（expect ソース準拠）

| 要素 | 仕様 |
|---|---|
| Back | top:60, left:16。`‹ Back` 17px, `theme.interactive` 色、`accessibilityRole="link"` |
| Hero title | `largeTitle` 2行: "Let's meet\nyour dog."（既存実装と一致、維持） |
| Subtitle | `subheadline` "A few quick details and you'll be walking in a minute." |
| Form | `GroupedCard` 1 枚 = Display Name / Email / Password の 3 行、各行 `TextInput labelPosition="inline"`、1・2 行目に `separator` |
| Helper text | フォーム直下に `footnote` "You can add your dog's profile on the next step. We'll remember paw-size, pace, and photo." |
| Primary CTA | `Button variant="primary"` label `Continue` |
| Footer | center-aligned `caption`: "By continuing you agree to the Terms and Privacy Policy."（Terms / Privacy は青 `interactive`、Pressable で Alert） |

## 変更ファイル一覧

1. **`apps/mobile/components/auth/RegisterForm.tsx`** — 大幅改修
   - TextInput 3 つを `GroupedCard` + `labelPosition="inline"` に置換
   - `separator` は 1・2 行目に付与
   - secondary Button（loginLink）削除 → Back ボタンに役割移行（画面側で実装）
   - submit Button label を `Continue` に（i18n 値変更）
   - Helper text 追加
   - Terms / Privacy フッター追加（Pressable × 2 + Alert）
   - Props 変更: `onLoginPress` 削除（Back は画面側が持つ）

2. **`apps/mobile/app/(auth)/register.tsx`** — 改修
   - register ステップで hero 上に Back Pressable を描画（`router.back()`）
   - RegisterForm の `onLoginPress` prop 渡しを削除
   - Confirm ステップは変更なし

3. **`apps/mobile/components/auth/RegisterForm.test.tsx`** — 既存テスト更新
   - `onLoginPress` prop 廃止に合わせて呼び出し修正
   - 新 CTA ラベル `Continue` に更新
   - Terms / Privacy Alert、helper text 表示の新規テスト追加

4. **`apps/mobile/lib/i18n/locales/ja.json`** と **`en.json`** — キー追加・値変更
   - `auth.register.subtitle` 追加
   - `auth.register.submit` の値を en: "Continue" / ja: "次へ" に更新
   - `auth.register.displayName` の値を en: "Your name" / ja: "お名前" に変更（expect 通りの柔らかい表現）
   - `auth.register.dogProfileHint` 追加（"You can add your dog's profile on the next step..." の多言語文言）
   - `auth.register.terms` / `auth.register.privacyPolicy` / `auth.register.termsPrefix` / `auth.register.termsAnd` 追加（"By continuing you agree to the {terms} and {privacy}." を文字列分割 or 補間で構築）
   - `auth.register.back` (en: "Back", ja: "戻る") — 表示 + accessibilityLabel 用
   - `auth.register.comingSoonTerms` 追加（or 既存 `auth.login.comingSoonApple` 相当を汎用キー化して再利用）

## 既存資産の再利用

- `components/ui/TextInput.tsx` の `labelPosition="inline"` + `separator`（PR #127 で追加済み）
- `components/ui/GroupedCard.tsx`
- `components/ui/Button.tsx`（`variant="primary"`）
- `theme/tokens.ts` の `largeTitle`, `subheadline`, `footnote`, `caption`
- Sign In で定着した「Alert で UI のみ先行」パターン

## 検証方法

1. **ユニットテスト**: `npx jest components/auth/ lib/i18n/` — RegisterForm + translations の key 対称性
2. **型チェック**: `npx tsc --noEmit`（事前存在の `lib/graphql/errors.test.ts` エラーは対象外）
3. **視覚確認**（CocoaPods 環境復旧後）: `npx expo run:ios` → Sign In 画面で "Create an account" タップ → Register 画面で目視確認:
   - Back が左上に表示・タップで戻る
   - GroupedCard に 3 行（Your name / Email / Password）
   - Helper text がフォーム直下
   - Continue ボタン（青）、空欄時は disabled
   - Terms / Privacy フッターの青リンク部分タップで Alert
4. **挙動確認**: 有効な値で Continue 押下 → signUp 呼び出し → userConfirmed の分岐でそれぞれ login / confirm へ遷移（既存テスト通り）

## 非スコープ（後続 PR）

- Terms / Privacy Policy の実 URL と外部ブラウザ表示
- Register → Confirm → 犬プロフィール誘導のフル実装（現状は login リダイレクトのまま）
- Confirm ステップの更なる UI 調整
