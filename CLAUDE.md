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

## Development Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Development Rules

各サービスの詳細な開発ルールはそれぞれの CLAUDE.md を参照：
- API: `apps/api/CLAUDE.md`
- Mobile: `apps/mobile/CLAUDE.md`
- E2E: `apps/e2e/CLAUDE.md`

This project uses the obra/superpowers plugin. Always check for relevant skills before taking any action.

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
