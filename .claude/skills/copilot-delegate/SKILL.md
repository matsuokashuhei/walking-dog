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
| `single` | 重い単発タスクを丸投げ | 1 つ新規作成（main の作業ツリーに直接書かせない） |
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
git worktree add ".claude/worktrees/copilot-${TASK_ID}" -b "copilot/${TASK_ID}" main
```

**全モードで worktree を作成する**（`single` でも main の作業ツリーに直接書かせると、main の uncommitted な変更との衝突や誤 push のリスクが高い）。

**JS/TS タスクは Copilot 起動前に依存をインストールしておく**。新規 worktree の `node_modules` は空で、これを Copilot が走行中に `npm ci` で埋めると 1〜2 分余計にかかる：

```bash
(cd ".claude/worktrees/copilot-${TASK_ID}/apps/mobile" && npm ci --no-audit --prefer-offline)
```

Rust タスクは Cargo の `target/` が共有されないので `docker compose build` も同様に先に走らせると速い。

### 3. Copilot CLI の起動

`references/permissions.md` の言語別テンプレを使って組み立てる。骨格：

```bash
copilot \
  -p "${TASK_DESCRIPTION}" \
  -C "${WORKTREE_PATH}" \
  --add-dir "${PROJECT_ROOT}" \
  --allow-all-tools \                           # ★ 非インタラクティブ (-p) には必須
  --no-ask-user \                               # ★ 自走モード（ユーザーに問い返さない）
  --effort high --no-color \                    # 出力を読みやすく、ログ汚染を避ける
  ${DENY_TOOLS} \                               # 危険操作だけ denylist で締める
  > "tasks/copilot/${SESSION}/logs/${TASK_ID}.log" 2>&1
```

`--allow-all-tools` を付けないと `-p` モードは止まる、または各ツールで permission prompt を出してハング → ログには何も流れず "なぜ動かないのか" がわからない、というのが一番のハマりどころ。`--no-ask-user` は Copilot がユーザーへの質問ツール (`ask_user`) を呼ばないようにする。

`--add-dir "${PROJECT_ROOT}"` の意義は **worktree の外にある指示書ファイル (`tasks/copilot/<session>/instruction.md`) と参照ドキュメント (`docs/`, `.claude/plans/`) を Copilot に読ませるため**。worktree の中身は `-C` で見える。

**parallel モードでは Bash の `run_in_background: true` で全タスクを同時起動する。** Bash tool は完了通知を返すので、各通知が来たら次の処理に進める（`sleep` で poll しないこと）。ただし**ユーザーから「進捗は？」と聞かれた場合や、長時間 (>5 min) 応答がない場合は `Read tasks/copilot/<session>/logs/<task-id>.log` でログを覗いてよい** — 完了通知ベースでドライブしつつ、安全弁としての覗き見は許容。

**common deny（全モード共通）** — allow は `--allow-all-tools` で済むので、denylist だけ書く：
- `--deny-tool='shell(git push)'` — push は禁止（worktree 隔離のため）
- `--deny-tool='shell(rm -rf)'` — 危険な削除は禁止
- `--deny-tool='shell(sudo)'` — 権限昇格は禁止
- `--deny-tool='shell(docker)'` — 本番資源への接続を防ぐ（プロジェクトの Rust ローカル開発は `docker compose run --rm` を別途許可するなら個別調整）

言語別の追加 deny は `references/permissions.md`。

### 4. 進捗監視 & 結果収集

各 task の完了通知を受けたら：

1. 終了コードと最後の数行をログから読む
2. worktree に入って `git log --oneline main..HEAD && git diff --stat main..HEAD` で commit と変更サマリを取得
3. `tasks/copilot/<session>/results.md` に下記の **3 ブロック構成** で追記する

スケルトンよりも実用性を優先したテンプレ：

```markdown
# Copilot delegation results — `${SESSION}`

**Task:** （指示書のスコープを 1〜2 行で要約）
**Mode:** parallel | single | second-opinion
**Worktree:** .claude/worktrees/copilot-${TASK_ID}
**Branch:** copilot/${TASK_ID}
**Commits:**
- `<sha>` <subject>

## Acceptance criteria check
| # | Criterion | Status |
|---|---|---|
| 1 | （instruction.md §6 から逐条転記） | ✅ / ⚠ / ❌ + 根拠（ファイル:行 or テスト名）|
| 2 | ... | ... |

## Tests
- `npx jest <targeted>` — N/N pass
- `npx tsc --noEmit` — clean
- ⚠ 不可解な失敗があれば、原因が本 PR 内か外かを明示

## Code review notes (Claude)
- 仕様への忠実度、トークン使用、accessibility、box-none 等の細部レビュー
- 仕様逸脱や follow-up 候補
- Blockers (NOTES.md があればここに転記)

## Recommended next steps
1. Visual verification (Mobile タスクなら §5b)
2. Merge / PR (§5c)
3. Worktree cleanup (§6)
```

スケッチ的な 5 行テンプレでは実用にならない（受け入れ基準チェックが落ちる）。**最低でも "受け入れ基準表 + テスト結果 + Claude のレビュー所見" の 3 ブロックを残すこと**。

### 5. レビューと結合判断

`parallel` の場合、各 worktree の diff を Claude が読み、矛盾や品質を判定。問題なければユーザーに結合方針を提示（cherry-pick / merge / rebase）。

`second-opinion` の場合、元実装と Copilot の代替案を side-by-side で比較し、長所短所をまとめてユーザーに返す。

**`NOTES.md` の事後処理** — Copilot が worktree のルートに `NOTES.md` を残していた場合（受け入れ基準を満たせなかったときや、スコープ外の既存 fail を見つけたときに使う）：

1. 内容を `results.md` の "Code review notes" → "Blockers" サブセクションに転記する
2. worktree で `git rm NOTES.md && git commit -m "chore: drop delegation notes from tracked tree"` で除去
3. `NOTES.md` は PR / マージ対象に含めない（リポジトリを delegation プロセスの痕跡で汚さない）

### 5b. Visual verification (Mobile only)

`apps/mobile/` 配下の編集を含むタスクは Jest + tsc に加え、**iOS Simulator での目視確認** が必須。手順:

1. main の Metro を一旦停止 (`kill $(lsof -t -i :8081)`)
2. worktree の `apps/mobile` から Metro を立ち上げ（`APP_ENV=local EXPO_PUBLIC_API_URL=http://localhost:3000 nohup npx expo start --port 8081 &`）
3. シミュレータのアプリを `xcrun simctl terminate && launch com.walkingdog.app` でリロードして worktree のバンドルを読み込ませる
4. 該当画面までナビゲートして before/after のスクリーンショットを `tasks/copilot/<session>/{before,after}.png` に保存
5. `results.md` の "Visual verification" セクションに添付し、A1/A2/... のような diff item ごとに ✅/⚠ を付ける
6. 最後に main の Metro を復元（worktree Metro を停止 → main で再起動）

詳細スクリプトは `ios-sim-test` skill を呼ぶ。`apps/api/` 単独タスクには不要（cargo test で十分）。

### 5c. マージ判断後の流れ

ユーザーが結合方針を返したら：

- **squash merge**: `git checkout main && git merge --squash copilot/${TASK_ID} && git commit -m "..."` でローカル merge。push は別途ユーザー指示で。
- **PR**: `commit-push-pr` skill か直接 `gh pr create` で別途実行。PR 本文には instruction.md のスコープ表、テスト結果、視覚確認結果、スコープ外の追跡項目を入れる。`NOTES.md` が §5 で除去済みであることを再確認。
- **cherry-pick**: 既存ブランチに `git cherry-pick <sha>`。

PR を作るときは、delegation の `tasks/copilot/<session>/` ディレクトリを PR の差分に含めるかは判断もの — 通常は **含めない**（セッション metadata であり、コードベースの一部ではない）。`.gitignore` に `tasks/copilot/` を追加しておくか、push 前に未追跡のままにする運用が望ましい。

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
