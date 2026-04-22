# Sign In 画面 Precise リデザイン計画

## Context

`docs/design/sign-in/expect.html.png`（`docs/design/app.html:508-550` が一次ソース）で示された Precise デザインと、現行実装 `apps/mobile/app/(auth)/login.tsx` + `components/auth/LoginForm.tsx` の見た目が大きく乖離している。PR #122-#126 で他画面（Walk Detail / Me / Dogs list / Dog detail / Auth hero）は Precise スタイル化済み。Sign In だけ Precise 化が不完全で、app mark・フォームレイアウト・CTA 周り・secondary 認証導線が未対応。

本変更により Sign In 画面を他画面と同等の Precise 仕上げに揃え、視覚的一貫性とプレミアム感を確立する。Apple Sign-In は UI のみ先行（機能は後続 PR）。

## 採用するスコープ（AskUserQuestion 結果）

1. **Apple Sign-In**: UI のみ先行。ボタンは出すが onPress は Alert「近日対応」表示。`expo-apple-authentication` 依存追加・API 改修なし。
2. **Subtitle コピー**: 現状維持。en `"Sign in to keep walking with your companion."` / ja `"散歩の記録と犬の友情を大切に"`。
3. **入力 UI**: 既存 `TextInput` を改修。`labelPosition?: 'top' | 'inline'` を opt-in で追加、デフォルトは `'top'` で後方互換維持。

## 目標デザイン仕様（expect ソース準拠）

| 要素 | 仕様 |
|---|---|
| App mark | 68×68, radius 22, `LinearGradient(135deg, #5eddb7, #0a84ff)`, 中央に白い paw SVG, shadow `offset(0,10) opacity 0.3 radius 30` |
| Hero title | `largeTitle` (34/700/-0.8), `Welcome back` ハードコーディング → i18n キー `auth.login.heading` に移行 |
| Subtitle | `subheadline` (15/400/21), `onSurfaceVariant` |
| Form | `GroupedCard` 1 枚 = Email 行 + separator(hairline, marginLeft 16) + Password 行。各行 `paddingHorizontal 16 / paddingVertical 14`, gap 10, label 幅 70 / 15px text2, value 17px flex 1 |
| Forgot password | フォーム直下右寄せ, 15px tint, marginTop 12 / marginBottom 24 |
| Primary CTA | `Button variant="primary"` `Sign in` (height 50, radius 16[既存 `radius.xl`]) |
| Divider | 中央 `or`（13px text2）+ 左右 hairline separator, `margin 20px 0` |
| Apple CTA | height 50, radius 16, light=#000 bg / 白 text (dark=#fff bg / 黒 text), 新規 `variant="apple"` 追加 or inline 実装 |
| Footer | 画面下部に `New here? Create an account` 14px + tint link |

## 変更ファイル一覧

### 新規 / 改修コンポーネント

1. **`apps/mobile/components/ui/TextInput.tsx`** — 改修
   - props に `labelPosition?: 'top' | 'inline'` 追加（デフォルト `'top'`）
   - `inline` 時: 行内横並び (label 70px 幅 / 15px `onSurfaceVariant` / value flex:1 17px)、border なし、padding 14/16 固定
   - `top` 時: 現状のまま
   - `separator?: boolean` 追加（GroupedCard 内で最後以外に hairline を下側に描画、`GroupedRow` に合わせる）
   - **後方互換**: 既存 RegisterForm / ConfirmForm 呼び出しはデフォルト `top` で変化なし

2. **`apps/mobile/components/ui/Button.tsx`** — 改修
   - `ButtonVariant` に `'apple'` 追加
   - Light: black bg / white text、Dark: white bg / black text（`useColorScheme` で分岐）
   - サイズは `default`（既存 50 height / radius.xl）を共有
   - Apple ロゴ glyph は SF Symbol `applelogo`（`IconSymbol` 経由）or `` 文字を leading に配置

3. **`apps/mobile/components/auth/AppMark.tsx`** — **新規**
   - 68×68 グラデーションタイル + 白 paw SVG + halo shadow
   - グラデーション依存: `expo-linear-gradient` を `package.json` に追加（Expo SDK 標準モジュール、ガイドラインに合致）
   - Paw SVG は `expect.html:516` のパスをそのまま React Native `react-native-svg` で描画（`react-native-svg` は既存依存想定、なければ追加）
   - `login.tsx` と `register.tsx` で再利用可能な形に（将来）

4. **`apps/mobile/components/auth/LoginForm.tsx`** — 大幅改修
   - `TextInput` を `GroupedCard` 内 2 行レイアウトに（`labelPosition="inline"` + 1 行目 `separator`）
   - `Forgot password?` リンクを追加（onPress は一旦 Alert「近日対応」or 空関数 + コメント、機能実装は後続 PR）
   - Primary Button `Sign in` のみ残す（`Create Account` の secondary Button は削除）
   - `or` divider 追加
   - `Continue with Apple` Button（variant=`apple`）追加、onPress は `Alert.alert('Coming soon')`
   - エラー表示位置: フォーム上部 or フォーム直下（hairline なし、`caption` サイズ維持）

5. **`apps/mobile/app/(auth)/login.tsx`** — 軽微改修
   - 絵文字 🐾 app mark を新 `AppMark` コンポーネントに置換
   - `Welcome back` を i18n キー `t('auth.login.heading')` に
   - hero と `LoginForm` の間のレイアウト調整
   - 画面下部に「New here? Create an account」フッター追加（`position: absolute, bottom: 50`）
   - 既存の `onRegisterPress={() => router.push('/(auth)/register')}` はフッターリンクの onPress に付け替え

### i18n 追加

6. **`apps/mobile/lib/i18n/locales/en.json`** と **`ja.json`**
   - `auth.login.heading` 追加: en `"Welcome back"` / ja `"おかえりなさい"`
   - `auth.login.forgotPassword` 追加: en `"Forgot password?"` / ja `"パスワードを忘れた場合"`
   - `auth.login.or` 追加: en `"or"` / ja `"または"`
   - `auth.login.continueWithApple` 追加: en `"Continue with Apple"` / ja `"Apple でサインイン"`
   - `auth.login.newHere` 追加: en `"New here?"` / ja `"はじめての方は"`
   - `auth.login.createAccountLink` 追加: en `"Create an account"` / ja `"アカウント作成"`
   - `auth.login.comingSoonApple` 追加: en `"Apple Sign-In is coming soon."` / ja `"Apple でサインインは近日対応予定です"`
   - 既存 `auth.login.subtitle` / `auth.login.register` はそのまま（register は未使用化）

### テスト追加・更新

7. **`apps/mobile/components/ui/TextInput.test.tsx`** — 新規 or 既存に
   - `labelPosition="top"` デフォルト動作（従来と同じ）
   - `labelPosition="inline"` 時のレイアウト検証（label / value の role ベース取得）
   - `separator={true}` 時に hairline が描画されることを検証

8. **`apps/mobile/components/ui/Button.test.tsx`** — 既存更新
   - `variant="apple"` 時の背景色（light/dark）を検証

9. **`apps/mobile/components/auth/LoginForm.test.tsx`** — 既存更新 or 新規
   - Sign in / Forgot password / Continue with Apple が描画されること
   - Apple タップで Alert が出ること（`jest.spyOn(Alert, 'alert')`）
   - 既存: email/password 入力 → Sign in 押下で signIn が呼ばれる、エラー文言表示

10. **`apps/mobile/components/auth/AppMark.test.tsx`** — 新規
    - レンダリングのスナップショット or glyph の accessibilityHidden 確認

## 依存追加

- `expo-linear-gradient` — gradient 背景（Expo 公式モジュール、ガイドライン `feedback_` なし）
- `react-native-svg` — paw アイコン SVG（既存依存あるか要確認、なければ追加）

両方とも `Docker Compose 経由 npm` で追加（memory: feedback_npm_docker.md）:
```
docker compose exec mobile npm install expo-linear-gradient react-native-svg
```

## 検証方法

1. **型チェック**: `docker compose exec mobile npx tsc --noEmit`
2. **テスト**: `docker compose exec mobile npm test -- components/ui/TextInput components/ui/Button components/auth/LoginForm components/auth/AppMark`
3. **iOS Simulator 実機確認**（memory: feedback_no_agent_for_simulator.md → Bash で直接実行）:
   - `apps/mobile` で `npx expo start` 起動
   - Simulator で `/(auth)/login` を表示
   - expect.html.png と actual.png を並べてピクセル差を確認:
     - App mark グラデーション + halo
     - Grouped form レイアウト（label 幅 70, value 右側）
     - Forgot password 右寄せ
     - Primary Sign in ボタンの色（disabled/enabled）
     - OR divider
     - Continue with Apple 黒ボタン
     - 画面下部 footer
   - Email / Password 入力 → Sign in タップで既存フローが動くこと
   - Continue with Apple タップで Alert 表示
   - Dark mode でも視覚崩れがないこと
4. **既存画面回帰**: RegisterForm / ConfirmForm（`TextInput` 既定 `top` 利用）が見た目・挙動とも不変
5. **i18n**: デバイス言語を ja / en で切り替え、両方表示を確認

## 再利用する既存資産

- `components/ui/GroupedCard.tsx:1-44` — フォーム行のコンテナ（radius.xl + elevation.low）
- `components/ui/Button.tsx:30-101` — primary / apple（新規追加）
- `theme/tokens.ts:146-213` — largeTitle / subheadline / body / caption typography
- `theme/tokens.ts:5-58` — interactive / onSurfaceVariant / border カラー
- `hooks/use-colors.ts` — light/dark 対応
- `hooks/use-auth.ts` — signIn 呼び出し（変更なし）
- `docs/design/app.html:515-516` — gradient + paw SVG パスの一次ソース

## 非スコープ（後続 PR）

- Apple Sign-In 機能実装（`expo-apple-authentication` + Cognito federated identity + API Apple OIDC）
- Forgot password 画面の実装（リンク先ルート作成、リセットメール送信）
- Register 画面の同系統 Precise リデザイン（別途必要なら別 PR で）
