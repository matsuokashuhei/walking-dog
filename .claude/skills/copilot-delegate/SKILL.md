---
name: copilot-delegate
description: >
  GitHub Copilot CLI (`copilot -p`) に実装タスクを委譲して、並列実装の分担・重い単発タスクの代行・セカンドオピニオン取得を行う。
  Use whenever the user says 「Copilot に実装させて」「Copilot に投げて」「Copilot で並列実装」「Copilot にセカンドオピニオン」「/copilot-delegate」「delegate to copilot」「run copilot in parallel」など、
  Claude 以外のエージェント（GitHub Copilot CLI）へ実装を切り出したいと示したとき。
  Claude のコンテキストを節約しつつ、独立タスクを並列実行したり代替案を比較したりするのに使う。
---

# Copilot Delegate Skill

GitHub Copilot CLI に実装タスクを委譲する。Claude が「監督者」、Copilot が「実装者」という分担で動く。

## When to Use

- 独立した実装タスクを **複数同時に** 進めたい（並列実装）
- 1 つの実装タスクが大きすぎて Claude の context を圧迫しそう（heavy single）
- Claude が書いた実装に対し、別エージェントの **代替案** が欲しい（second-opinion）
- ユーザーが明示的に `/copilot-delegate` か「Copilot に投げて」と指示した

## When NOT to Use

- タスクが小さく Claude が直接書いた方が速い（1〜数行の編集）
- 設計判断やヒアリングが必要な段階 — Copilot は与えられたタスクを実行するだけ、要件詰めには向かない
- 強い security 配慮が必要（秘密鍵を含むファイル操作など）— Claude が直接扱う
- 既に作業中のセッションがあり、worktree が散らかる懸念があるとき

## Prerequisites

| 項目 | 確認方法 |
|---|---|
| `copilot` CLI インストール済み | `which copilot`（`/Users/.../.local/bin/copilot` 想定） |
| 認証済み | 初回 `copilot` 起動で対話的に GitHub にログイン |
| git worktree が動く | `git worktree list` で既存 worktree を確認 |

未インストールなら `npm install -g @github/copilot` で導入。

## Modes / モード

3 モードを選んで実行する。詳細フローは `references/modes.md` を参照。

| Mode | 用途 | Worktree |
|---|---|---|
| `parallel` | 独立タスクの同時実装 | タスクごとに 1 つ作成 |
| `single` | 重い単発タスクを丸投げ | 現在の worktree を流用 |
| `second-opinion` | 代替実装を比較取得 | 1 つ新規作成 |

ユーザーが mode を指定しなかった場合は、タスク数・内容から推測して提案する：
- タスクが 2 つ以上独立して書ける → `parallel`
- タスクが 1 つで実装範囲が広い → `single`
- 既に実装済みコードに対する要望 → `second-opinion`

## Core Flow

### 1. タスク定義の作成

`tasks/copilot/<session-slug>/tasks.yaml` を作る。`<session-slug>` は短い kebab-case (例: `dog-form-refactor`)。

```yaml
session: dog-form-refactor
mode: parallel              # parallel | single | second-opinion
language: typescript        # rust | typescript | terraform — references/permissions.md と対応
project_root: /Users/matsuokashuhei/Development/walking-dog
tasks:
  - id: rename-fields
    description: |
      apps/mobile/src/screens/DogForm.tsx の state 変数名を camelCase から snake_case に変えて、
      GraphQL mutation の引数名に揃える。テストも更新。
  - id: extract-validator
    description: |
      apps/mobile/src/screens/DogForm.tsx の validation ロジックを apps/mobile/src/validators/dog.ts に抽出し、
      DogForm から import するように差し替え。
```

`single` / `second-opinion` の場合は `tasks:` を 1 要素にする。

### 2. Worktree の準備

`references/worktree.md` の手順に従い、各 task について：

```bash
git worktree add ".claude/worktrees/copilot-${TASK_ID}" -b "copilot/${TASK_ID}"
```

`single` モードは既存 worktree を流用するので作成不要。

### 3. Copilot CLI の起動

`references/permissions.md` の言語別テンプレを使って組み立てる。骨格：

```bash
copilot -p "${TASK_DESCRIPTION}" \
  -C "${WORKTREE_PATH}" \
  --add-dir "${PROJECT_ROOT}" \
  ${ALLOW_TOOLS} \
  ${DENY_TOOLS} \
  > "tasks/copilot/${SESSION}/logs/${TASK_ID}.log" 2>&1
```

**parallel モードでは Bash の `run_in_background: true` で全タスクを同時起動する。** Bash tool は完了通知を返すので、各通知が来たら次の処理に進める（poll しない）。

**common allow/deny（全モード共通）**：
- `--allow-tool='write'` — ファイル編集を許可
- `--allow-tool='shell(git:*)'` — `git add`/`commit`/`diff` などローカル git は許可
- `--deny-tool='shell(git push)'` — push は禁止（worktree 隔離のため）
- `--deny-tool='shell(rm -rf)'` — 危険な削除は禁止
- `--deny-tool='shell(sudo)'` — 権限昇格は禁止

言語別の追加は `references/permissions.md`。

### 4. 進捗監視 & 結果収集

各 task の完了通知を受けたら：

1. 終了コードと最後の数行をログから読む
2. `git -C <worktree> diff --stat` で変更サマリを取得
3. `tasks/copilot/<session>/results.md` に下記フォーマットで追記：

```markdown
## ${TASK_ID}
- status: success | failed
- duration: 4m23s
- diff:
  - apps/mobile/src/screens/DogForm.tsx (+12 -8)
  - apps/mobile/src/validators/dog.ts (new, +34)
- notes: テスト1件失敗、Copilot ログ末尾参照
```

### 5. レビューと結合判断

`parallel` の場合、各 worktree の diff を Claude が読み、矛盾や品質を判定。問題なければユーザーに結合方針を提示（cherry-pick / merge / rebase）。

`second-opinion` の場合、元実装と Copilot の代替案を side-by-side で比較し、長所短所をまとめてユーザーに返す。

### 6. クリーンアップ

採用しなかった worktree は：

```bash
git worktree remove ".claude/worktrees/copilot-${TASK_ID}" --force
git branch -D "copilot/${TASK_ID}"
```

採用したものは `feedback_worktree_when_parallel_agents` のルールに従って残す。

## Error Handling

Copilot が失敗した場合、**エラーを握りつぶさない**：

- ログ全文を `tasks/copilot/<session>/logs/<task-id>.log` に保存
- `results.md` の `status: failed` 行に最終エラー行をそのまま転記
- Claude が原因を解析し、(a) Copilot に再投入、(b) Claude 自身で実装に切り替え、(c) ユーザーに判断を仰ぐ — のいずれかを提案

エラーを隠すような optional 化・try/catch 追加・fallback 値での "修正" は禁止（プロジェクトルール）。

## Project-Specific Constraints

walking-dog プロジェクトで Copilot に渡すタスクには以下を必ず伝える：

| 制約 | 反映方法 |
|---|---|
| Rust は `cargo` 直叩き禁止、Docker Compose 経由 | タスク説明に「`docker compose run --rm api cargo test` を使う」と明記、`--deny-tool='shell(cargo:*)'` |
| npm も Docker 経由（モバイルは例外あり） | タスク説明で開発手順を指定 |
| iOS sim は `APP_ENV=local` 必須 | タスク説明に明記 |
| theme/tokens.ts のトークンを使う（magic number 禁止） | タスク説明に「tokens.ts のトークンのみ使用、値がなければトークン追加」と明記 |
| 認証は Rust API 経由（Cognito 直接 NG） | 認証絡みのタスクで明記 |

これらは Copilot にはプロジェクト memory が見えないため、Claude が毎回タスク説明に注入する責任を持つ。

## Quick Reference

### よくある呼び出し例

**single:**
```
ユーザー: 「/copilot-delegate single  apps/api/src/graphql/dog.rs を SeaORM 0.13 の API に移行して」
Claude: mode=single, language=rust, deny cargo direct → docker compose で test 走らせるタスク説明に変換して copilot -p 起動
```

**parallel:**
```
ユーザー: 「次の3つを並列で: (1) MeScreen の余白統一、(2) MyDogScreen の戻るボタン追加、(3) common ヘッダー抽出」
Claude: mode=parallel, 3 つの task_id を切って 3 worktree、3 つの copilot -p を run_in_background で同時起動
```

**second-opinion:**
```
ユーザー: 「今書いた WalkSummary.tsx、Copilot にも書かせて比較したい」
Claude: 元のコミット sha を控え、新 worktree で同じ仕様を Copilot に再実装させ、diff を並べて返す
```

詳細は `references/modes.md` を参照。
