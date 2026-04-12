# GitHub Actions `Test Mobile` 失敗の修正

## Context

PR #70（`chore/mobile-remove-apple-auth`、すでにマージ済み）で `Test Mobile` ワークフローの `Install dependencies` ステップが失敗している。

エラー:
```
npm error `npm ci` can only install packages when your package.json and
package-lock.json or npm-shrinkwrap.json are in sync.
Missing: react@19.2.5 from lock file
```

PR のコミット差分は `expo-apple-authentication` を `package.json` と `package-lock.json` から削除しただけで、React 関連の変更は無い。にもかかわらず失敗している → **ロックファイル自体が CI の npm からは不整合に見える構造になっている**ことが根本原因。

### 根本原因

1. `apps/mobile/package.json` はルートで `react@19.1.0` を固定。
2. `jest-expo@55.0.11` が自身の deps として `react-test-renderer@19.2.0` をネスト取得し、この `react-test-renderer` の peer は `react@^19.2.0`。
3. ロックファイルには `node_modules/jest-expo/node_modules/react-test-renderer@19.2.0` は入っているが、それに対応するネスト版 `react@19.2.x` は含まれていない（ルートの `react@19.1.0` で満たされている前提）。
4. ローカルの **npm 11.12.1** はこの構成を許容してロック生成する。
5. CI (`actions/setup-node@v4`, `node-version: 20`) は **npm 10.x** で、peer 依存の不整合をより厳密に検査し「`react@19.2.5`（`^19.2.0` の最新）がツリーに必要なのにロックに無い」と判断して `npm ci` を失敗させる。

メインにマージ済みなので、新規 PR ブランチで修正コミットを入れる必要がある。

## 修正方針

**npm の `overrides` を使って `react-test-renderer` を `19.1.0` に固定する**。これでネストされた `react-test-renderer@19.2.0` が消え、`^19.2.0` の peer 要求自体が発生しなくなる。npm のバージョンに依存せず整合が取れる。

採用理由:
- React/Expo 本体のバージョンを動かさず影響範囲が最小（`react-test-renderer` はテスト専用）。
- CI の npm バージョンを固定する案（`npm install -g npm@11`）より、ロックファイル自体を正にする方が恒久的で他環境にも波及しない。
- Expo SDK 54 は `react@19.1.0` 前提なので、react 側を 19.2 に上げる案は他パッケージと噛み合わないリスクがある。

## 変更ファイル

### 1. `apps/mobile/package.json`

トップレベルに `overrides` フィールドを追加（`devDependencies` の直後あたりが自然）:

```json
"overrides": {
  "react-test-renderer": "19.1.0"
}
```

### 2. `apps/mobile/package-lock.json`

上記変更後に以下を実行してロックを更新:

```bash
cd apps/mobile
npm install
```

- `node_modules/jest-expo/node_modules/react-test-renderer` の version が `19.1.0` になる
- ネスト `react` への peer 要求が消え、`npm ci` が整合する

### 3. 動作確認

ローカルで CI と同じ環境を再現して検証:

```bash
# Docker で Node 20 + npm 10 を使って npm ci を通す
cd apps/mobile
docker run --rm -v "$PWD:/app" -w /app node:20-alpine sh -c "npm ci && npm test"
```

- `npm ci` が成功することを確認
- `npm test` が成功することを確認（既存の Jest スイート）

プロジェクトルールに従い `npm` は直接実行せず Docker 経由で。

## ブランチ / PR 戦略

1. `main` から新規ブランチ `fix/mobile-lockfile-peer-deps` を切る
2. 上記 2 ファイルを修正してコミット
3. PR を作成 → `Test Mobile` workflow がグリーンになることを確認してマージ

## Verification Checklist

- [ ] `apps/mobile/package.json` に `overrides.react-test-renderer: "19.1.0"` が追加されている
- [ ] `apps/mobile/package-lock.json` の `node_modules/jest-expo/node_modules/react-test-renderer` が `19.1.0` になっている（差分で確認）
- [ ] `package-lock.json` の他の `react` 関連エントリ（ルート `react@19.1.0` など）は変わっていない
- [ ] Docker Node 20 環境で `npm ci` が成功
- [ ] Docker Node 20 環境で `npm test` が成功
- [ ] PR の GitHub Actions で `Test Mobile` がグリーン

## 参考: 不採用にした代替案

- **CI の npm を 11 にピン留め**: `- run: npm install -g npm@11` を CI に追加する案。動くが npm バージョンを変えると他ツール（audit, cache）の挙動も変わる副作用があり、根本治療ではない。
- **`react` を 19.2.x に引き上げ**: Expo SDK 54 は `react@19.1.0` 前提で、`react-native` / `expo-router` 等との互換性検証が必要になり影響大。
- **`jest-expo` を 55.0.10 以下にダウングレード**: 上流修正を待つ方針で、対症療法でありメンテ負担が増える。
