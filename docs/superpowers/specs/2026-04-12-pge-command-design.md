# /pge コマンド設計書 — Planner-Generator-Evaluator 開発ワークフロー

## 背景

既存の `dev_ja` コマンドは 13 のカスタムエージェントによるフルパイプライン（ヒアリング→設計→実装→レビュー→テスト）。
仕様が明確なタスクに対して、Anthropic 公式スキルを組み合わせた軽量な開発ループが欲しい。
Generator→Evaluator の繰り返し改善ループにより、品質基準を満たすまで自動的にコードを磨く。

## スコープ

**やること**:
- Planner / Generator / Evaluator の 3 ロールによる開発ワークフロー
- 各ステップに DoD（完了の定義）チェックリストを設定
- 次のエージェントが前のエージェントの出力を検証するクロスバリデーション
- 合格後は PR 作成と CLAUDE.md 更新まで自動実行

**やらないこと**:
- 要件ヒアリング（dev_ja の Interviewer が担当）
- カスタムエージェントの新規作成（公式スキルのみ使用）
- dev_ja の置き換え（並列で共存）

## 設計判断

| 項目 | 決定 | 理由 |
|------|------|------|
| コマンド名 | `/pge` | Planner-Generator-Evaluator の頭文字。短く覚えやすい |
| dev_ja との関係 | 並列共存 | dev_ja はフルパイプライン、pge は軽量改善ループ |
| スキル種別 | Anthropic 公式スキルのみ | メンテナンスコスト低。公式アップデートに追従 |
| 検証パターン | クロスバリデーション | 次のエージェントが前の出力を検証。自己評価バイアスを排除 |
| 終了条件 | Evaluator の合格判定 | DoD チェックリスト全パスで合格。最大 3 回リトライ |
| 合格後アクション | PR 作成 + CLAUDE.md 更新 | commit-commands + claude-md-management で自動化 |

## 全体フロー

```
/pge "機能の説明"
  │
  ├─ Step 1: Planner
  │   ├─ doc-coauthoring → 設計ドキュメント
  │   └─ feature-dev (Discovery → Architecture) → 実装計画
  │   └─ Generator が計画の DoD を検査
  │       ├─ 不合格 → Planner に差し戻し (最大 3 回)
  │       └─ 合格 → Step 2 へ
  │
  ├─ Step 2: Generator ←───────────┐
  │   └─ feature-dev (Implementation) → コード実装
  │   └─ Evaluator が実装の DoD を検査
  │       ├─ 不合格 → Generator に差し戻し │ (最大 3 回)
  │       └─ 合格 → Step 3 へ            │
  │                                       │
  ├─ Step 3: Evaluator                    │
  │   ├─ pr-review-toolkit → コード品質レビュー
  │   ├─ claude-md-management → 学び反映
  │   └─ 品質 DoD を検査
  │       ├─ 不合格 ──────────────────────┘ (フィードバック付き)
  │       └─ 合格 → Step 4 へ
  │
  └─ Step 4: Ship
      └─ commit-commands:commit-push-pr → PR 作成
```

## 各ステップの詳細

### Step 1: Planner

**使用スキル**: `doc-coauthoring`, `feature-dev`

**実行手順**:
1. `doc-coauthoring` で設計ドキュメントを作成する
   - 目的・背景・スコープ・技術的アプローチを文書化
2. `feature-dev` の Discovery → Architecture フェーズを実行する
   - コードベース探索（code-explorer エージェント）
   - 明確化質問でユーザーと認識合わせ
   - アーキテクチャ提案（code-architect エージェント）
   - タスク分解して実装計画を作成

**出力**: 設計ドキュメント + 実装計画（タスクリスト付き）

### Step 2: Generator

**使用スキル**: `feature-dev`

**実行手順**:
1. Planner の計画を受け取る
2. **計画の DoD を検査**（Generator によるクロスバリデーション）
3. 検査合格後、`feature-dev` の Implementation フェーズでコード実装
   - TDD（RED → GREEN → REFACTOR）で実装
   - 計画のタスクリストを順次消化

**出力**: 実装済みコード + テスト

### Step 3: Evaluator

**使用スキル**: `pr-review-toolkit`, `claude-md-management`

**実行手順**:
1. Generator の実装を受け取る
2. **実装の DoD を検査**（Evaluator によるクロスバリデーション）
3. `pr-review-toolkit` でコード品質レビュー
   - code-reviewer: 全般的な品質チェック
   - silent-failure-hunter: エラーハンドリング検査
   - pr-test-analyzer: テストカバレッジ分析
   - comment-analyzer: コメント品質チェック
4. `claude-md-management:revise-claude-md` で学びを反映

**出力**: レビュー結果（合格 / フィードバック付き不合格）

### Step 4: Ship

**使用スキル**: `commit-commands:commit-push-pr`

**実行手順**:
1. 変更をコミット
2. リモートにプッシュ
3. PR を作成（サマリー + テストプラン付き）

**出力**: PR URL

## DoD（完了の定義）チェックリスト

### Planner DoD — Generator が検査

Generator は実装を開始する前に、Planner の計画が以下を満たすか検査する。

- [ ] 設計ドキュメントが `docs/` 配下に保存されている
- [ ] 目的・背景が明記されている
- [ ] スコープ（やること / やらないこと）が定義されている
- [ ] 技術的アプローチが選択済みで、理由が記載されている
- [ ] 既存コードの調査が完了し、再利用方針が明確
- [ ] 実装タスクが具体的に分解されている
- [ ] テスト方針が含まれている
- [ ] **計画が実行可能である** — 曖昧な指示や不足情報がなく、実装に着手できる
- [ ] **計画に過不足がない** — スコープに対して多すぎず少なすぎない

**不合格時**: フィードバックを添えて Planner に差し戻す（最大 3 回）

### Generator DoD — Evaluator が検査

Evaluator はコード品質レビューの前に、Generator の実装が以下を満たすか検査する。

- [ ] **計画のタスクがすべて実装済み** — Planner の計画に対して未実装タスクがない
- [ ] **計画の意図通りに実装されている** — 技術的アプローチから逸脱していない
- [ ] テストが書かれている — TDD で実装されている
- [ ] テストが全パス — `cargo test` / `npm test` 等がグリーン
- [ ] 型チェックがパス — コンパイルエラー / 型エラーなし
- [ ] lint がパス — フォーマットと lint ルールに違反なし
- [ ] スコープ外の変更がない — 計画外のリファクタやファイル変更なし

**不合格時**: フィードバックを添えて Generator に差し戻す（最大 3 回）

### Evaluator DoD（コード品質）

- [ ] コードレビューで Critical 指摘が 0 件
- [ ] テストカバレッジに重要なギャップがない
- [ ] サイレント障害（エラー握りつぶし等）がない
- [ ] 不正確・陳腐化したコメントがない
- [ ] CLAUDE.md の更新提案が反映済み

**不合格時**: フィードバック（Critical 指摘の詳細 + 修正方針）を添えて Generator に差し戻す（最大 3 回）

### Ship DoD

- [ ] コミットメッセージが conventional commit 形式
- [ ] GitHub に PR が作成されている
- [ ] PR 説明に変更サマリーとテストプランが含まれている

## エスカレーション

各ステップで最大 3 回リトライしても合格しない場合、ユーザーにエスカレーションする。
エスカレーション時には以下を報告する:

- どのステップで失敗したか
- 各リトライで何が不合格だったか
- 推奨される対応（スコープ縮小、手動修正、等）

## ファイル構成

```
.claude/
├── commands/
│   └── pge.md           # コマンド定義
└── skills/
    └── pge/
        └── SKILL.md     # スキル本体（オーケストレーションロジック）
```
