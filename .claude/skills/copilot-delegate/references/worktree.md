# Worktree — Setup & Cleanup

git worktree を使った隔離環境の作成・破棄手順。

## Why worktree?

- **並列実行の隔離**: 複数の Copilot プロセスが同じ working tree を編集すると競合する
- **採否判断の遅延**: Copilot の変更を main ブランチに直接出さず、別ブランチで保留してレビュー可能
- **プロジェクトルール**: `feedback_worktree_when_parallel_agents` で並列エージェント実行時の worktree 使用が必須

## 命名規則

| パターン | 用途 |
|---|---|
| `.claude/worktrees/copilot-<task-id>` | parallel / second-opinion で各タスク用 |
| `.claude/worktrees/copilot-alt` | second-opinion の代替案専用（task-id 不明時） |

`<task-id>` は kebab-case 短文字列（例: `rename-fields`, `extract-validator`）。
ブランチ名は `copilot/<task-id>` で揃える（slash 区切りで Copilot 作業を見分けやすく）。

## Worktree 作成

### parallel: 各タスクごとに作成

```bash
PROJECT_ROOT="/Users/matsuokashuhei/Development/walking-dog"
cd "${PROJECT_ROOT}"

for TASK_ID in rename-fields extract-validator; do
  git worktree add ".claude/worktrees/copilot-${TASK_ID}" -b "copilot/${TASK_ID}"
done
```

**注**: ベースブランチを指定したい場合：
```bash
git worktree add ".claude/worktrees/copilot-${TASK_ID}" -b "copilot/${TASK_ID}" main
```

### single: 作成しない

`single` モードは現在の作業 worktree を流用する。`pwd` をそのまま `-C` に渡せばよい。

### second-opinion: baseline 直前から分岐

```bash
PRE_SHA=$(git rev-parse HEAD^)        # baseline の直前
git worktree add ".claude/worktrees/copilot-alt" "${PRE_SHA}"
cd ".claude/worktrees/copilot-alt"
git checkout -b copilot/alternative
```

これで Copilot は元実装を見ない状態で同じ仕様を実装することになる。

## Worktree の確認

```bash
git worktree list
```

出力例：
```
/Users/matsuokashuhei/Development/walking-dog                                  abc1234 [main]
/Users/matsuokashuhei/Development/walking-dog/.claude/worktrees/elegant-...    def5678 [claude/elegant-questing-dahl]
/Users/matsuokashuhei/Development/walking-dog/.claude/worktrees/copilot-...    9abcdef [copilot/rename-fields]
```

## Copilot に渡すときの作業ディレクトリ

```bash
copilot -p "${TASK_DESCRIPTION}" \
  -C ".claude/worktrees/copilot-${TASK_ID}" \
  --add-dir "${PROJECT_ROOT}" \           # メインリポジトリも参照可能に
  ...
```

`-C` で Copilot の cwd を worktree にし、`--add-dir` で `PROJECT_ROOT`（メインリポジトリ）の **読み取り** を許可する。これで Copilot は他 worktree のコードを参照できないが、共通の docs / packages は読める。

## Worktree のクリーンアップ

### 採用しなかったとき（破棄）

```bash
TASK_ID="rename-fields"
PROJECT_ROOT="/Users/matsuokashuhei/Development/walking-dog"
cd "${PROJECT_ROOT}"

# 1. worktree を削除（中身ごと消える）
git worktree remove ".claude/worktrees/copilot-${TASK_ID}" --force

# 2. ブランチも削除
git branch -D "copilot/${TASK_ID}"
```

`--force` は uncommitted changes があっても削除する。Copilot の変更を完全に捨てる前提なので付ける。

### 採用したとき（結合）

3 つの選択肢：

**Option A — cherry-pick:**
```bash
git -C "${PROJECT_ROOT}" checkout main
git cherry-pick copilot/${TASK_ID}
```

**Option B — merge:**
```bash
git -C "${PROJECT_ROOT}" checkout main
git merge --no-ff copilot/${TASK_ID}
```

**Option C — そのまま worktree で続行:**
- worktree をそのまま開発ブランチとして使う場合は何もしない
- 後で PR を切るときに `git push origin copilot/${TASK_ID}` する（worktree 外から push）

採用後の worktree も用済みなら：
```bash
git worktree remove ".claude/worktrees/copilot-${TASK_ID}"
# ブランチは残す（履歴のため）
```

### 一括クリーンアップ

セッション終了時にまとめて掃除：

```bash
git worktree list | awk '/copilot-/ {print $1}' | while read WT; do
  TASK_ID=$(basename "${WT}" | sed 's/^copilot-//')
  git worktree remove "${WT}" --force 2>/dev/null || true
  git branch -D "copilot/${TASK_ID}" 2>/dev/null || true
done
git worktree prune
```

## Trouble shooting

| 症状 | 原因 | 対処 |
|---|---|---|
| `fatal: <path> already exists` | 前回の残骸 | `git worktree remove <path> --force` で消してから再試行 |
| `fatal: invalid reference` | branch 名が既存 | `git branch -D copilot/<task-id>` で消してから再試行 |
| `git worktree list` に幽霊エントリ | 手動で削除した残骸 | `git worktree prune` |
| Copilot が `--add-dir` 外を触りたがる | タスク範囲が広すぎ | タスクを分割するか、`--add-dir` を追加 |

## メイン CLAUDE.md / feedback memory との整合

- `feedback_worktree_when_parallel_agents.md` — 並列実行時 worktree 必須（本スキル準拠）
- `feedback_no_redundant_cd.md` — 不要な `cd <project-root>` を避ける。worktree 内で完結する操作はそのまま実行
