# /pge コマンド実装計画

## Context

既存の `dev_ja` コマンド（13カスタムエージェント）と並列で、Anthropic 公式スキルのみを使った軽量な開発ループコマンド `/pge` を作る。
Planner→Generator→Evaluator の 3 ロールで、クロスバリデーション + 改善ループにより品質基準を満たすまでコードを磨く。

設計書: `docs/superpowers/specs/2026-04-12-pge-command-design.md`

## 実装ステップ

### Step 1: コマンドファイル作成
- **ファイル**: `.claude/commands/pge.md`
- **内容**: YAML frontmatter（argument-hint, description）+ `pge` スキルを読み込む指示
- **参考**: `.claude/commands/dev_ja.md` の形式に従う

### Step 2: スキル本体作成
- **ファイル**: `.claude/skills/pge/SKILL.md`
- **内容**: 4 ステップのオーケストレーションロジック
  1. **Planner セクション**: doc-coauthoring → feature-dev (Discovery→Architecture) を呼び出す手順
  2. **Generator セクション**: 計画の DoD 検査 → feature-dev (Implementation) の手順
  3. **Evaluator セクション**: 実装の DoD 検査 → pr-review-toolkit + claude-md-management の手順
  4. **Ship セクション**: commit-commands:commit-push-pr の手順
- **DoD チェックリスト**: 各セクションにクロスバリデーション用チェックリストを記載
- **ループ制御**: 最大 3 回リトライ、エスカレーションロジック

### Step 3: CLAUDE.md 更新
- **ファイル**: `CLAUDE.md`
- **変更**: 開発フェーズとスキルのセクションに `/pge` コマンドを追記

## 重要な参考ファイル
- `.claude/commands/dev_ja.md` — コマンドファイルの形式
- `.claude/skills/dev-ja/SKILL.md` — スキルのオーケストレーション形式（参考）
- `docs/superpowers/specs/2026-04-12-pge-command-design.md` — 設計書

## 検証方法
1. `/pge "テスト用の簡単なタスク"` を実行して各ステップが順次動作することを確認
2. 各スキル（doc-coauthoring, feature-dev, pr-review-toolkit, commit-commands, claude-md-management）が正しく呼び出されることを確認
3. DoD チェックリストが各ステップで評価されることを確認
4. 不合格時のリトライ → エスカレーションフローが機能することを確認
