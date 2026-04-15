---
name: refactor
description: >
  Use when user asks to refactor a codebase, module, or feature — especially when
  scope is large enough that a single session cannot hold full context.
  Triggers: 「リファクタリングして」「コード整理」「技術的負債を返したい」「設計を見直したい」.
  Drives a 4-phase workflow: principle-based scan → solution research →
  prioritized implementation plan → phased execution in fresh sessions.
---

# Refactor Skill

4フェーズでリファクタリングを回す。コンテキストを使い切らないために、調査・計画・実装を分離し、**実装は新しいセッションで** 走らせる。

## When to Use

- 複数ファイルをまたぐリファクタ、3つ以上のステップ、または設計判断を含む
- 「技術的負債」「整理」「リファクタ」という語が出た
- 一度に実装しきるには規模が大きい / コンテキストが足りない恐れがある

## When NOT to Use

- 1ファイル数行の typo/rename — 直接編集で十分
- 機能追加・バグ修正が目的 — それぞれ専用の brainstorming / systematic-debugging を使う

## Core Principle

**調査・計画と実装を別セッションに分ける。** 同一セッションで全フェーズ走らせるとコンテキストが枯渇して実装が劣化する。各フェーズの成果物を Markdown に落として、新セッションがそれを読み込んで続きを実行できる状態を作る。

## 成果物の置き場

すべて `tasks/refactor/<topic>/` 配下にまとめる。`<topic>` は対象範囲を表す短い kebab-case (例: `mobile-utils`, `api-auth`, `walk-recording`)。

| ファイル | フェーズ | 内容 |
|---|---|---|
| `01-scan.md` | Phase 1 | 原則違反の一覧 |
| `02-solutions.md` | Phase 2 | 各課題のベストプラクティス解 |
| `03-plan.md` | Phase 3 | 優先度付きの実装フェーズ一覧 |
| `progress.md` | Phase 4 | 各フェーズの実行状況 |

## Phase 1: Scan

対象ディレクトリ / モジュールを読み、以下の **コーディング鉄則** に照らして課題を洗い出す。鉄則を1つでも飛ばさない。

**設計原則**
- **DRY** — 同じロジックが2箇所以上にコピーされていないか
- **KISS** — 過剰に賢い/複雑な書き方をしていないか
- **YAGNI** — 今使わない抽象・拡張ポイントを作っていないか

**SOLID**
- **S** Single Responsibility — クラス/関数が1つのことだけやっているか
- **O** Open/Closed — 拡張に開いて修正に閉じているか
- **L** Liskov — 親クラスを子クラスで置き換え可能か
- **I** Interface Segregation — 使わないメソッドに依存していないか
- **D** Dependency Inversion — 具体ではなく抽象に依存しているか

**テスト・品質**
- テスタビリティ (テストが書きにくい = 設計が悪いサイン)
- 関心の分離 (UI / ビジネスロジック / データアクセスの混在)
- 副作用の局所化 (DB書き込み・API呼び出しが中央に散らばっていないか)

**実務マインド**
- 動くコードより **読めるコード** — 6ヶ月後の自分が読めるか
- 早すぎる最適化 — 計測なしで最適化していないか
- コードは **負債** — 不要なコード、重複、死んだコードを残していないか

### 出力フォーマット (`01-scan.md`)

```markdown
# Scan: <topic>

対象: <path>
日付: <YYYY-MM-DD>

## 課題一覧

### [DRY] apps/mobile/src/utils/a.ts:12-40 / b.ts:8-35
同一の日付フォーマット処理が2箇所にある。

### [SRP] apps/api/src/handlers/walk.rs:120-260
ハンドラが入力検証・DB書き込み・S3アップロードを同一関数で実行。

...
```

各エントリは **原則タグ + 場所:行 + 症状** を1行で示せる粒度にする。症状は事実のみ、解決策は書かない (Phase 2で扱う)。

## Phase 2: Solutions Research

`01-scan.md` の各課題について、候補解とベストプラクティスを調査する。

- 必要に応じ **WebSearch** で該当言語/フレームワークの定石を調べる
- 既存コードに使える utility / pattern が無いか `Grep` / `Glob` で確認 (CLAUDE.md: 「新コードを提案する前に再利用可能な実装を探せ」と整合)
- 各課題ごとに **候補解 → 採用案 → 理由** の3ブロックで書く

### 出力フォーマット (`02-solutions.md`)

```markdown
# Solutions: <topic>

## [DRY] 日付フォーマット重複
**候補**
- A: 共通 util `formatDate()` に抽出
- B: dayjs のラッパーを導入

**採用**: A (既存依存を増やさない / KISS)

**参照**: https://... (MDN Intl.DateTimeFormat)
```

## Phase 3: Implementation Plan

課題を **実装フェーズ** に束ねる。1フェーズ = 1セッションで完結する粒度。

### 優先度

以下の 3 軸で並べる:
- **impact** (どれだけコード品質/保守性が改善するか)
- **ease** (どれだけ簡単か — 変更行数、影響範囲)
- **risk** (デグレの可能性、テストカバレッジの薄さ)

指針: **`(impact × ease) / risk`** が高い順に前に置く。簡単で効果が大きくリスクが低いものから手をつける。

### フェーズの書き方 (`03-plan.md`)

```markdown
# Plan: <topic>

## Phase 1: 日付フォーマット共通化 (優先度: 高)
- **対象課題**: [DRY] a.ts:12-40 / b.ts:8-35
- **変更**: `apps/mobile/src/utils/date.ts` に `formatDate()` を追加、2箇所を置き換え
- **完了条件**:
  - 既存テスト緑
  - grep で重複コードが消えている
- **依存**: なし
- **検証**: `docker compose run --rm mobile npm test -- date`
- **推定規模**: S (30分以内)

## Phase 2: walk handler の責務分離 (優先度: 中)
...
```

各フェーズに必ず **完了条件 / 依存 / 検証手順** を含める。

## Phase 4: Phased Execution

**新しい Claude セッション** を起動して1フェーズずつ実行する。同一セッションで続けない。

### セッション起動テンプレ

```
tasks/refactor/<topic>/03-plan.md の Phase <N> を実行して。
TDD で進める (superpowers:test-driven-development)。
完了したら progress.md の Phase <N> を完了に更新して。
```

- 計画実行は `superpowers:executing-plans` に委ねる
- 独立タスクが複数あるフェーズは `superpowers:subagent-driven-development` で並列化
- 1フェーズ終わるたび `progress.md` を更新 (日付、コミットハッシュ、残課題)

### `progress.md` フォーマット

```markdown
# Progress: <topic>

- [x] Phase 1: 日付フォーマット共通化 — 2026-04-14, commit abc1234
- [ ] Phase 2: walk handler の責務分離
- [ ] Phase 3: ...
```

## Quick Reference

| フェーズ | やること | 出力 | ツール |
|---|---|---|---|
| 1 Scan | 鉄則チェックで課題列挙 | `01-scan.md` | Read / Grep / Glob |
| 2 Solutions | 候補解 + BP 調査 | `02-solutions.md` | WebSearch / Grep |
| 3 Plan | 優先度付き実装計画 | `03-plan.md` | — |
| 4 Execute | 新セッションで実装 | `progress.md` | executing-plans |

## Common Mistakes

| やりがちなミス | 正しい対応 |
|---|---|
| 同一セッションで Phase 1-4 を走らせる | **Phase 4 は必ず新セッション**。成果物の Markdown だけ読み込ませる |
| 鉄則を1つスキップ (例: YAGNI だけ飛ばす) | 全9項目 (DRY/KISS/YAGNI + SOLID 5項目 + テスト・実務) をチェック |
| 優先度なしで全部並列にやる | `(impact × ease) / risk` で並べ、上位から着手 |
| エラーを try/catch で握りつぶす変更を「リファクタ」と呼ぶ | CLAUDE.md のルール違反。根本原因を直す (エラー隠蔽は却下) |
| 「ついでに機能追加」「ついでに最適化」 | スコープ外。`03-plan.md` に載っていない変更はやらない |
| Scan の症状欄に解決策を書く | 症状と解は分離。Phase 1 は事実列挙のみ |

## Red Flags — STOP

- 計画なしに実装を始めている → Phase 3 に戻る
- Phase 1 の課題リストが空または1-2件しかない → 鉄則チェックが雑、やり直し
- Phase 4 で計画外のファイルを触っている → 停止してスコープ確認
- 「動けば OK」でテストを書かずに終える → CLAUDE.md の Verification Before Done 違反
