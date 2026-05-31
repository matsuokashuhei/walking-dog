# walking-dog — Monorepo

## Product Vision

このプロダクトは犬と飼い主に幸せを届けるために存在する。機能・UI を設計するときは、以下の3軸で判断すること。

### 犬の体験
- 散歩中に出会う他の犬との交流を親密にする
- **問い**: この機能は犬同士の出会い・関係性を深めるか？

### データによる散歩の最大化
- 散歩をデータ化して蓄積し、分析することで散歩の楽しさを最大化する
- **問い**: この機能で得たデータは、散歩体験の改善につながるか？

### 飼い主の貢献心
- 犬が散歩を楽しんでいることをデータで示し、飼い主の犬への貢献心を引き出す
- **問い**: この画面・機能は飼い主の「もっと散歩してあげたい」という気持ちを引き出すか？

## General Rules

- **エラーを隠す回避策を提案しない** — バグ修正では必ず根本原因を特定して直す。エラーを握りつぶすコード（optional化、try/catch追加、fallback値）を「修正」として提案してはならない。
- **差分の小ささより全体最適を優先する** — コードは常にシステム全体の整合性、単純さ、拡張性が最も高くなる形で設計すること。既存コードの変更を最小にすることや、変更を局所に閉じ込めること自体を目的にしてはならない。必要なら変更範囲が広がっても、その場しのぎではなく、より一貫した理想の設計を選ぶこと。

## Development Rules

各サービスの詳細な開発ルールはそれぞれの CLAUDE.md を参照：
- API: `apps/api/CLAUDE.md`
- Mobile: `apps/mobile/CLAUDE.md`

## Directory Structure

```
walking-dog/
├── apps/       # Deployable applications (depend on packages/)
│   ├── api/    # Backend API
│   ├── mobile/ # React Native / Expo app
│   └── web/    # Web frontend
├── docs/       # Design documents and specs
├── infra/      # Cloud infrastructure (IaC)
├── packages/   # Shared libraries used by apps/
│   ├── ui/     # (future) Shared UI components
│   ├── types/  # (future) Shared TypeScript types
│   └── utils/  # (future) Shared utilities
└── README.md
```

# Development Workflow

This project uses the obra/superpowers plugin. Always check for relevant skills before taking any action.

## Project-scoped Skills

- UI の設計・実装・リファクタリングで Expo / React Native / `@expo/ui` / `@expo/ui/swift-ui` を扱う場合は、最初に `.codex/skills/expo-ui-docs-first/SKILL.md` を読むこと。repo-local skill の自動検出が効かないセッションでも、このファイルを明示的に参照してから計画・実装する。

## 開発フェーズとスキル

各フェーズで以下の superpowers スキルを使うこと：

### 設計フェーズ
- **brainstorming** — アイデア出し・方針検討
- **writing-plans** — 実装計画の作成

### 実装フェーズ
- **subagent-driven-development** — subagent に実装を委譲
- **executing-plans** — 作成した計画を実行
- **dispatching-parallel-agents** — 独立したタスクを並列実行
- **test-driven-development** — RED → GREEN → REFACTOR サイクルで実装

### レビューフェーズ
- **requesting-code-review** — 実装完了後、subagent にコードレビューを依頼
- **receiving-code-review** — レビューコメントを受け取ったら、盲目的に実装せず技術的に検証してから対応
- **finishing-a-development-branch** — 実装完了後のブランチをクリーンアップして PR を作成

### 統合ワークフロー
- **`/dev_ja`** — フルパイプライン（ヒアリング→設計→実装→レビュー→テスト）。要件が曖昧な大規模タスク向け
- **`/pge`** — Planner-Generator-Evaluator の改善ループ。仕様が明確な小〜中規模タスク向け。公式スキルのみ使用

### デバッグフェーズ
- **systematic-debugging** — バグ・テスト失敗・CI エラーに直面したら使う

## セッション終了時

作業が終わったら必ずセッションを振り返り、学びをCLAUDE.mdまたはskillに反映すること。
