# Plan: プランファイルのブラウザプレビュー（mo + cmux）

## Context

プランモードで生成される `.claude/plans/*.md` をターミナル上で追い続けるのが辛い。
`mo`（Markdownプレビューア）と `cmux`（内蔵ブラウザ付きターミナル）を使って、プランファイルの作成・更新時に自動でブラウザプレビューを表示する。

参考記事: https://dev.classmethod.jp/articles/claude-code-hooks-plan-browser-preview/

## 現状

- **プロジェクト設定** (`.claude/settings.json`): `PostToolUse` で `Edit|Write` → cargo clippy を実行中
- `mo` と `cmux` はインストール済み
- `jq` はインストール済み

## 実装手順

### Step 1: Hook スクリプト作成

`.claude/hooks/plan-preview.sh` を作成（プロジェクト内）:

```bash
#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
if [[ "$FILE" == */.claude/plans/*.md ]]; then
  mo --no-open "$FILE"
fi
```

実行権限を付与: `chmod +x`

### Step 2: プロジェクト設定に Hook 追加

`.claude/settings.json` の `hooks.PostToolUse` に追加（既存の cargo clippy hook と並列）:

```json
{
  "matcher": "Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/plan-preview.sh\"",
      "timeout": 10
    }
  ]
}
```

## 変更ファイル

1. `.claude/hooks/plan-preview.sh` — 新規作成
2. `.claude/settings.json` — PostToolUse に hook 追加

## 検証方法

1. プランモードに入ってプランファイルが作成される際に `mo` が起動することを確認
2. cmux で `Cmd + Shift + L` でブラウザスプリットを開き、`mo` のプレビューURLにアクセスして表示確認
