# Issue #81 — Expo Router の `as never` 型キャストを棚卸しする

- **日付**: 2026-04-13
- **ブランチ**: `feature/issue-81-remove-as-never`
- **関連 Issue**: #81
- **関連 PR**: #82 (先行修正 — `_layout.tsx` の `(tabs)` → `/(tabs)/walk` と `app/index.tsx` 追加)
- **影響範囲**: `apps/mobile/app/` のみ

---

## 1. 目的・背景

### 根本原因
PR #80 で HOME タブを削除した後、実機ビルドとログイン直後に **Unmatched Route — Page could not be found** が発生した。`app.config.ts` に `experiments.typedRoutes: true` が設定されている環境で、`router.replace('/(tabs)' as never)` のように **group-only パス**（末尾が `)` で終わる segment）を渡していたのが原因。`(tabs)` は URL 上ではなく組織のためのグループなので、そこに遷移しても具体的なルートに解決できず Unmatched Route になる。

### なぜ `as never` が付いていたのか
Expo Router v6 の `typedRoutes` は `router.push`/`replace` の引数を `Href` 型で制約する。型チェックに違反するパスを渡すとコンパイルエラーになるので、エラーを握りつぶすために `as never` が広まっていた。型エラーを潰すだけで runtime の正当性は保証されない。

### 現在の状態
- `apps/mobile/app/` に `as never` が **7 箇所** 残存（PR #82 で直接原因の 1 箇所だけ修正済み）
- 生成型 `.expo/types/router.d.ts` を確認した結果、**残り 7 箇所のパスはすべて有効な typed route**。つまり `as never` を外しても TS エラーは起こらない見込み

### 目的
1. 残り 7 箇所の `as never` を棚卸しして削除し、型チェックを本当に通す
2. 再発防止として eslint ルールで `as never` を禁止する
3. group-only パスへの navigate を今後書けないよう、コーディングルールを明文化する

---

## 2. スコープ

### やること
- `apps/mobile/app/` 配下、router 引数に付いている 7 箇所すべての `as never` を削除
- 削除後に `tsc --noEmit` + `expo lint` + iOS Simulator での動作確認
- eslint flat config (`apps/mobile/eslint.config.js`) に `as never` 禁止ルールを追加
- 設計ドキュメントと PR 説明にコーディング規約を明記

### やらないこと
- API / Infra / E2E の変更
- `typedRoutes` / `reactCompiler` 等の Expo 設定変更（`experiments.typedRoutes: true` は維持）
- `as any` の棚卸し（範囲が広すぎる。別 Issue で扱う）
- router 以外の `as never`（主に lint ルール適用時に検出された場合のみ対応）
- 新規テストファイルの追加（対象コードは navigation 副作用のみで、既存の `__tests__/` に当該シナリオがない。E2E は別 Issue）

---

## 3. 現状と修正後

### 7 箇所の分類

| # | ファイル:行 | 現在のコード | 修正後 | 型推論の根拠 |
|---|------------|--------------|--------|-------------|
| 1 | `app/_layout.tsx:31` | `router.replace('/(auth)/login' as never)` | `router.replace('/(auth)/login')` | generated `href` union に `` `${'/(auth)'}/login` `` 相当あり |
| 2 | `app/_layout.tsx:37` | `` router.replace(`/invite/${token}` as never) `` | `` router.replace(`/invite/${token}`) `` | generated `href` union に `` `/invite/${Router.SingleRoutePart<T>}` `` あり（`token: string` で一致） |
| 3 | `app/(auth)/register.tsx:22` | `router.replace('/(auth)/login' as never)` | `router.replace('/(auth)/login')` | 同 #1 |
| 4 | `app/(auth)/register.tsx:30` | 同上 | 同上 | 同 #1 |
| 5 | `app/(auth)/login.tsx:27` | `router.push('/(auth)/register' as never)` | `router.push('/(auth)/register')` | generated `href` union に `` `${'/(auth)'}/register` `` 相当あり |
| 6 | `app/invite/[token].tsx:72` | `router.replace('/(auth)/login' as never)` | `router.replace('/(auth)/login')` | 同 #1 |
| 7 | `app/invite/[token].tsx:129` | `router.replace('/(tabs)/dogs' as never)` | `router.replace('/(tabs)/dogs')` | generated `href` union に `` `${'/(tabs)'}/dogs` `` 相当あり |

### 根拠 (一次ソース)
`apps/mobile/.expo/types/router.d.ts` の `href` union を確認した結果（該当部分を抜粋）:

```ts
href: ... | `${'/(auth)'}/login${`?${string}` | `#${string}` | ''}`
    | `/login${`?${string}` | `#${string}` | ''}`
    | `${'/(auth)'}/register${...}`
    | `${'/(tabs)'}/dogs${...}`
    | `/invite/${Router.SingleRoutePart<T>}${...}`
    | ...
```

同ディレクトリ内の他コード（例: `app/(tabs)/dogs.tsx:60` の `` router.push(`/dogs/${id}`) ``）は `as never` なしで既に動作しており、typed routes が動的テンプレートリテラルを正しく推論できることも確認できる。

### 動的パス #2 について
Issue では「`Href` 型で書き直し推奨」とあったが、generated 型を確認すると template literal 形式 (`` `/invite/${string}` ``) で十分型が通る。**Phase B (`Href<...>` 型への書き直し)** は、Phase A で tsc が通った場合は **実施不要**。もし Phase A で型エラーが残ったら、初めて `{ pathname: '/invite/[token]', params: { token } }` の object 形式へのリファクタを検討する。

---

## 4. 技術的アプローチ

### アプローチの選択肢

**A. 単純削除 + 手動リファクタ** ← 推奨
全 7 箇所の `as never` を削除し、tsc で検証。型エラーが出たら個別にリファクタ。eslint ルールは `no-restricted-syntax` で追加。

**B. codemod 導入**
ts-morph 等で自動変換。今回は 7 箇所なので過剰投資。

**C. `Href` 型への明示アノテーション**
`const href: Href = ...` を経由させる。generated 型があれば不要。

**選択**: A。理由は
- 箇所数が少ない（7 件）
- generated 型が揃っており、削除だけで型が通る見込みが高い
- リスクが局所的で、各箇所の diff がレビュー容易

### eslint ルール設計

#### 選択肢
1. **広いルール**: `as never` をファイル全体で禁止（`TSAsExpression[typeAnnotation.type="TSNeverKeyword"]`）
2. **狭いルール**: `router.push` / `router.replace` / `router.navigate` の引数に限定

#### 推奨: 広いルール
- 理由: 既存 coding-style (`No any types`) と整合。`as never` は型エラーを握りつぶす anti-pattern で、router 以外でも使う理由がない。
- セレクタ: `TSAsExpression[typeAnnotation.type="TSNeverKeyword"]`
- メッセージ: `` `as never` キャストは型エラーを握りつぶすため禁止。正しい型を調べて使うこと。router.push/replace の引数なら typed routes の生成型を信頼する。 ``
- スコープ: `apps/mobile/eslint.config.js` のみ（他 workspace への影響は別 Issue）

#### 実装イメージ
```js
// apps/mobile/eslint.config.js
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*'] },
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression[typeAnnotation.type="TSNeverKeyword"]',
          message:
            "`as never` キャストは型エラーを握りつぶすため禁止。router.push/replace には typed routes の生成型を使う。",
        },
      ],
    },
  },
]);
```

### Group-only パスの禁止

Lint で AST 検出するのは脆くなりやすい（末尾 `)` segment 検出）ため、**コーディング規約としてドキュメント化**に留める。`apps/mobile/.claude/rules/common/navigation.md` に追記する。

---

## 5. 動作確認方法

### 自動検証（ホスト直接実行）
`apps/mobile` 配下は Docker Compose マウントがないため、ホストで直接実行する:

```bash
cd apps/mobile

# TypeScript 型チェック
npx tsc --noEmit

# Lint
npx expo lint

# Jest (navigation 以外の unit test)
npm test
```

### 手動検証 (iOS Simulator — ios-simulator-skill)
先行 PR #82 で再現した Unmatched Route が再発しないことを確認する:

1. Metro 起動
   ```bash
   cd apps/mobile && npm run start:dev
   ```
2. iOS Simulator で app 起動（ios-simulator-skill の `launch_app.sh` を利用）
3. 以下のシナリオを手動で実行:
   - [ ] **起動シナリオ**: cold start → 未ログインなら `/(auth)/login` に遷移する（白画面 / Unmatched Route が出ない）
   - [ ] **ログイン成功**: 認証後 `/(tabs)/walk` が表示される
   - [ ] **ログアウト**: 再び `/(auth)/login` に戻る
   - [ ] **登録 → ログイン遷移**: Register 画面で成功した後 `/(auth)/login` に戻る
   - [ ] **Login 画面の "Register" リンク**: `/(auth)/register` に遷移する
   - [ ] **招待 deep link**: 未ログイン時に `walking-dog://invite/<token>` を開くと `/(auth)/login` にリダイレクトされ、ログイン後に `/invite/<token>` に戻る
   - [ ] **招待受諾 → 犬一覧**: 招待受諾画面の "犬を見る" ボタンで `/(tabs)/dogs` に遷移する
4. 各画面でスクリーンショット取得（ios-simulator-skill の `screenshot.sh`）

### deep link テストコマンド
```bash
# 招待 deep link
xcrun simctl openurl booted "walking-dog://invite/test-token-xxx"
```

### eslint ルールの動作確認
```bash
cd apps/mobile
# 意図的に as never を書いて検出されることを確認
echo "const x = 1 as never;" >> /tmp/sample.ts  # 例
# または既存ファイルに一時的に追加して npx expo lint 実行
```

---

## 6. 想定リスクと対策

| リスク | 影響 | 対策 |
|-------|------|------|
| #2 の動的パスで tsc エラーが残る | 実装停滞 | Phase B を発動 — `{ pathname, params }` object 形式に切り替え |
| `as never` 削除後に runtime で Unmatched Route | プロダクション不具合 | iOS Simulator で全 7 シナリオを手動検証 |
| eslint ルールが別の `as never` 用途を壊す | CI 失敗 | 先にリポジトリ全体 grep で他の `as never` を確認（現時点で `apps/mobile/` 配下は router 引数のみ） |
| typedRoutes の generated 型が stale | tsc 通るが runtime NG | Metro を再起動して `.expo/types/router.d.ts` を再生成してから tsc 実行 |

---

## 7. DoD (Definition of Done)

- [ ] 7 箇所の `as never` がすべて削除されている
- [ ] `cd apps/mobile && npx tsc --noEmit` が 0 error で通る
- [ ] `cd apps/mobile && npx expo lint` が 0 error で通る
- [ ] `cd apps/mobile && npm test` が 0 failure
- [ ] eslint.config.js に `as never` 禁止ルールが追加され、意図的な `as never` 混入で error 扱いになることを確認
- [ ] iOS Simulator で §5 の 7 シナリオすべて動作確認（スクリーンショット添付）
- [ ] `navigation.md` に group-only パス禁止ルールが追記されている
- [ ] PR が作成され、レビュー OK

---

## 8. 参考

- expo-router typed routes: https://docs.expo.dev/router/reference/typed-routes/
- PR #82 (先行修正): `_layout.tsx` の `(tabs)` → `/(tabs)/walk`
- 生成型: `apps/mobile/.expo/types/router.d.ts`
- Expo Router 公式 `Href` 型定義: `apps/mobile/node_modules/expo-router/build/typed-routes/types.d.ts`
