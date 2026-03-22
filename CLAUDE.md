# walking-dog — Monorepo

## General Rules

- **git コマンドを実行する前に必ず `pwd` で作業ディレクトリを確認する**

## Development Rules

各サービスの詳細な開発ルールはそれぞれの CLAUDE.md を参照：
- API: `apps/api/CLAUDE.md`
- Mobile: `apps/mobile/CLAUDE.md`
- E2E: `apps/e2e/CLAUDE.md`

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

## 開発フェーズとスキル

各フェーズで以下の superpowers スキルを使うこと：

### 設計フェーズ
- **brainstorming** — アイデア出し・方針検討
- **writing-plans** — 実装計画の作成

### 実装フェーズ
- **using-git-worktrees** — フィーチャーブランチの作業環境を分離
- **subagent-driven-development** — subagent に実装を委譲
- **executing-plans** — 作成した計画を実行
- **dispatching-parallel-agents** — 独立したタスクを並列実行
- **test-driven-development** — RED → GREEN → REFACTOR サイクルで実装

### レビューフェーズ
- **requesting-code-review** — 実装完了後、subagent にコードレビューを依頼
- **receiving-code-review** — レビューコメントを受け取ったら、盲目的に実装せず技術的に検証してから対応
- **finishing-a-development-branch** — 実装完了後のブランチをクリーンアップして PR を作成

### デバッグフェーズ
- **systematic-debugging** — バグ・テスト失敗・CI エラーに直面したら使う

## セッション終了時

作業が終わったら必ずセッションを振り返り、学びをCLAUDE.mdまたはskillに反映すること。
