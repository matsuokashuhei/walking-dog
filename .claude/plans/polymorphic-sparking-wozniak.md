# Plan: untracked 設定・ドキュメントをコミットして PR

## Context

main ブランチに 16+ の未コミット変更（`.claude/` PGE ワークフロー設定、`apps/` ツール設定、`docs/` 設計&仕様ドキュメント、CLAUDE.md 更新）が溜まっている。リポジトリに保存して PR を作る。

ユーザー回答:
- `.claude/plans/` 19 ファイルは全部コミット
- `.claude/hookify.*.local.md` は `.local.md` 命名のためローカル専用 → gitignore
- ブランチ: `chore/claude-setup-and-docs`

## 手順

### 0. 準備
- `pwd` で `/Users/matsuokashuhei/Development/walking-dog` 確認
- `git checkout -b chore/claude-setup-and-docs` で新規ブランチ作成（main に直接コミットしない）

### 1. `.gitignore` 更新（C1）
- `.gitignore` に `.claude/hookify.*.local.md` を追加
- コミット: `chore: ignore local-only hookify rule files`

### 2. Claude Code ワークフロー設定（C2）
対象:
- `.claude/settings.json`（M: plugins 有効化、plan-preview hook、plansDirectory 等）
- `.claude/hooks/plan-preview.sh`（New）
- `.claude/agents/pge-planner.md` `pge-generator.md` `pge-evaluator.md`（New）
- `.claude/commands/pge.md`（New）
- `.claude/skills/pge/SKILL.md`（New）
- `CLAUDE.md`（M: /dev_ja と /pge ワークフロー追記）

コミット: `chore(claude): add PGE workflow agents, commands, skills, and settings`

### 3. プラン履歴（C3）
- `.claude/plans/*.md` 19 ファイル
- コミット: `chore(claude): archive plan history`

### 4. Apps ツール設定（C4）
- `apps/api/.gitignore`（New: Rust/Cargo 用）
- `apps/mobile/.npmrc`（New: npm security hardening）
- コミット: `chore(apps): add Rust gitignore and npm security settings`

### 5. 設計ドキュメント（C5）
- `docs/design/` 配下（active_walk, dashboard, dog_list, dog_profile, invite_acceptance, k9_protocol, settings_archival, sign_in, sign_up, verification_code, walk_history）
- コミット: `docs(design): add screen design documents`

### 6. 仕様ドキュメント（C6）
- `docs/specs/2026-04-05-stitch-prompt.md`
- `docs/specs/2026-04-05-ui-redesign-design-system.md`
- `docs/superpowers/specs/2026-03-29-github-actions-unit-tests-design.md`
- `docs/superpowers/specs/2026-04-12-pge-command-design.md`
- コミット: `docs(specs): add UI redesign and workflow specs`

### 7. Push + PR
- `git push -u origin chore/claude-setup-and-docs`
- `gh pr create` — title: `chore: add Claude Code PGE workflow, tooling configs, and design docs`

## 変更ファイル一覧

**Modified**
- `.claude/settings.json`
- `.gitignore`
- `CLAUDE.md`

**New**
- `.claude/agents/pge-{planner,generator,evaluator}.md`
- `.claude/commands/pge.md`
- `.claude/hooks/plan-preview.sh`
- `.claude/skills/pge/SKILL.md`
- `.claude/plans/*.md` (19)
- `apps/api/.gitignore`
- `apps/mobile/.npmrc`
- `docs/design/**`
- `docs/specs/2026-04-05-*.md` (2)
- `docs/superpowers/specs/2026-{03-29,04-12}-*.md` (2)

## 検証

1. 各コミット後に `git status` で想定ファイルのみステージ済み確認
2. 全コミット後 `git log --oneline main..HEAD` で 6 件のコミット確認
3. `git diff main..HEAD --stat` で差分サマリー確認
4. `gh pr view` で PR URL 取得

## 注意事項

- main ブランチでは作業しない（新規ブランチ作成必須）
- `.claude/hookify.*.local.md` はコミットしない（gitignore に追加するのみ）
- `git add .` や `git add -A` は使わず、各ファイルを明示的に指定する（global instruction 遵守）
