# Plan: ios-sim-test と ios-simulator-skill の復元

## Context

コミット `b7ca976` (PR #61, 2026-04-11) で「Computer Use MCP に置き換えたため未使用」として以下 2 つの skill が削除されたが、再び利用したいので復活させる。

- `.claude/skills/ios-sim-test/` — skill.md 1 ファイル (219 行)
- `.claude/skills/ios-simulator-skill/` — SKILL.md + scripts/ 配下 37 ファイル (約 10,400 行)

これらは `b7ca976` の BLE advertiser podspec 修正に付随して削除されたもので、コード本体とは独立。親コミット `b7ca976~1` のツリーから丸ごとチェックアウトして復元すれば、削除前と完全に同じ内容が戻る。

## Approach

`git checkout <parent-commit> -- <path>` を使い、作業ツリーとインデックスにまとめて復元する。ファイル数が多い（38 ファイル）ので、ディレクトリ単位でチェックアウトする。

## Steps

1. **作業ディレクトリ確認**
   ```bash
   pwd   # /Users/matsuokashuhei/Development/walking-dog であること
   ```

2. **2 つのディレクトリを親コミットから復元**
   ```bash
   git checkout b7ca976~1 -- .claude/skills/ios-sim-test/
   git checkout b7ca976~1 -- .claude/skills/ios-simulator-skill/
   ```
   - `b7ca976~1` は削除直前のコミットなので、削除前の完全な内容が取得できる。
   - `--` 以降はパス指定。ディレクトリを指定すると配下すべてが復元される。
   - このコマンドはファイルをワーキングツリー＋インデックスに復元する（ステージ済み状態になる）。

3. **復元の検証**
   ```bash
   # ファイル数・存在確認
   ls .claude/skills/ios-sim-test/
   ls .claude/skills/ios-simulator-skill/
   ls .claude/skills/ios-simulator-skill/scripts/
   ls .claude/skills/ios-simulator-skill/scripts/common/
   ls .claude/skills/ios-simulator-skill/scripts/xcode/
   
   # 復元前コミット (b7ca976~1) と内容が一致するか
   git diff b7ca976~1 -- .claude/skills/ios-sim-test/ .claude/skills/ios-simulator-skill/
   # ↑ 出力が空なら完全一致
   
   # ステージ状態
   git status
   ```

4. **コミットは作らない** — ユーザーから明示指示があるまで、ステージ済み状態で止める。

## Critical Files

| パス | 行数 | 役割 |
|---|---|---|
| `.claude/skills/ios-sim-test/skill.md` | 219 | iOS Simulator テストの skill 定義 |
| `.claude/skills/ios-simulator-skill/SKILL.md` | 240 | メイン skill 定義 |
| `.claude/skills/ios-simulator-skill/scripts/*.py` | 多数 | simctl / Xcode / ジェスチャ等の操作スクリプト |
| `.claude/skills/ios-simulator-skill/scripts/common/*.py` | 〃 | 共有ユーティリティ |
| `.claude/skills/ios-simulator-skill/scripts/xcode/*.py` | 〃 | Xcode ビルド/キャッシュ/xcresult 解析 |

## Verification

- `git diff b7ca976~1 -- <paths>` が空であること（完全復元の証拠）。
- `.claude/skills/ios-simulator-skill/scripts/xcode/xcresult.py` を含む 37 ファイルが `ios-simulator-skill/` 配下に存在すること（`git show --stat b7ca976` の削除一覧と一致）。
- `git status` に `new file:` として両ディレクトリ配下のファイルが並んでいること。

## Non-Goals

- コミットの作成（ユーザー指示を待つ）。
- `.gitignore` / `CLAUDE.md` / `MEMORY.md` など他の修正。
- skill の内容更新や再設計（削除時点の状態そのままを戻す）。
