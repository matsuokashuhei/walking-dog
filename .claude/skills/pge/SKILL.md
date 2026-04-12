---
name: pge
description: "Planner-Generator-Evaluator の3ロールで開発する軽量ワークフロー。公式スキルのみ使用。クロスバリデーション + 改善ループで品質基準を満たすまでコードを磨く。"
---

# PGE ワークフロー — Planner-Generator-Evaluator

Anthropic 公式スキルを組み合わせた軽量な開発ループ。次のエージェントが前のエージェントの出力をクロスバリデーションする。

## いつ使うか

- 仕様が明確な小〜中規模のタスク
- 改善ループで品質を磨きたいとき
- 公式スキルベースで軽量に開発したいとき

## いつ使わないか

- 要件が曖昧で、ユーザーヒアリングが必要 → `dev_ja` を使う
- 1行のバグ修正や設定変更
- 13エージェントのフルパイプラインが必要 → `dev_ja` を使う

## ワークフローフロー

```
Step 1: Planner
  └─ doc-coauthoring → feature-dev (Discovery → Architecture)
  └─ [Generator が計画の DoD を検査]
       ├─ FAIL → Planner に差し戻し (最大 3 回)
       └─ PASS → Step 2

Step 2: Generator ←─────────────────────┐
  └─ feature-dev (Implementation)       │
  └─ [Evaluator が実装の DoD を検査]      │
       ├─ FAIL → Generator に差し戻し    │ (最大 3 回)
       └─ PASS → Step 3                 │
                                         │
Step 3: Evaluator                        │
  └─ pr-review-toolkit → claude-md-management
  └─ [品質 DoD を検査]
       ├─ FAIL (Critical あり) ──────────┘ (フィードバック付き)
       └─ PASS → Step 4

Step 4: Ship
  └─ commit-commands:commit-push-pr
```

## エージェント一覧

| ステップ | エージェント | モデル | 役割 |
|---------|-----------|--------|------|
| 計画 | `pge-planner` | opus | 設計ドキュメント + 実装計画の作成 |
| 実装 | `pge-generator` | sonnet | 計画の DoD 検査 + TDD 実装 |
| 評価 | `pge-evaluator` | opus | 実装の DoD 検査 + コード品質レビュー + 学び反映 |

## 実行ステップ

### Step 0: セットアップ

1. 新しい feature ブランチを作成する:
   ```
   git checkout -b feature/<機能名>
   ```
2. TaskCreate で全ステップをタスク登録する:
   - Planner → Generator → Evaluator → Ship

### Step 1: Planner

`pge-planner` エージェントを起動する:
- 提供する情報: ユーザーからの機能説明
- Planner が設計ドキュメントと実装計画を作成するまで待つ
- 出力: Planner 完了レポート（設計ドキュメントパス + 実装計画）

### Step 1.5: 計画の DoD 検査

`pge-generator` エージェントを起動する（Phase 1 のみ）:
- 提供する情報: Planner 完了レポート全文 + 指示「Phase 1: Planner の計画を検査」
- FAIL: 不備リストを新しい `pge-planner` エージェントに送り修正させる
- PASS: Step 2 へ進む
- 最大 3 回のリトライ後、ユーザーにエスカレーション

### Step 2: Generator（実装）

`pge-generator` エージェントを起動する（Phase 2）:
- 提供する情報: Planner 完了レポート全文 + 指示「Phase 2: 実装」
- Generator が TDD でコード実装するまで待つ
- 出力: Generator 完了レポート（実装済みタスク + テスト結果）

### Step 2.5: 実装の DoD 検査

`pge-evaluator` エージェントを起動する（Phase 1 のみ）:
- 提供する情報: Generator 完了レポート + Planner の実装計画 + 指示「Phase 1: Generator の実装を検査」
- FAIL: 不備リストを新しい `pge-generator` エージェントに送り修正させる（Phase 2）
- PASS: Step 3 へ進む
- 最大 3 回のリトライ後、ユーザーにエスカレーション

### Step 3: Evaluator（品質レビュー + 学び反映）

`pge-evaluator` エージェントを起動する（Phase 2 + Phase 3）:
- 提供する情報: Generator 完了レポート + 指示「Phase 2: コード品質レビュー + Phase 3: 学びの反映」
- Evaluator が pr-review-toolkit + claude-md-management を実行するまで待つ
- FAIL（Critical あり）: フィードバックを新しい `pge-generator` エージェントに送り修正させる
- PASS: Step 4 へ進む
- 最大 3 回のリトライ後、ユーザーにエスカレーション

### Step 4: Ship

`commit-commands:commit-push-pr` スキルを呼び出し:
1. 変更をコミット
2. リモートにプッシュ
3. PR を作成（サマリー + テストプラン付き）

Ship DoD:
- [ ] コミットメッセージが conventional commit 形式
- [ ] GitHub に PR が作成されている
- [ ] PR 説明に変更サマリーとテストプランが含まれている

PR URL をユーザーに報告して完了。

## エスカレーション

各ステップで最大 3 回リトライしても合格しない場合、ユーザーにエスカレーションする。

エスカレーション時には以下を報告する:
- どのステップで失敗したか
- 各リトライで何が不合格だったか（DoD チェックリストの不合格項目）
- 推奨される対応（スコープ縮小、手動修正、計画の見直し等）

## ハンドオフルール

1. オーケストレーター（あなた）がエージェント間のコンテキストをテキストとして中継する — エージェントは互いのファイルを読まない
2. 各エージェントに常に設計ドキュメント/実装計画の全文を提供する — 省略しない
3. 各エージェントの出力が次のステージの入力になる
4. 差し戻し時は不備リスト + 修正方針を必ず含める
5. リトライでは新しいエージェントインスタンスを作成する（再利用しない）

## 絶対にやってはいけないこと

- DoD 検査を省略して次のステップに進まない
- 3 回のリトライを超えてユーザーにエスカレーションしない
- Evaluator にコードを修正させない（修正は Generator の役割）
- 計画にないスコープ外の変更を追加しない
- エージェントに前ステップの出力を省略して渡さない
