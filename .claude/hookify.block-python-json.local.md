---
name: block-python-json
enabled: true
event: bash
pattern: python3?\s+-c\s+.*json
action: block
---

**Python による JSON 解析はブロックされました。**

このプロジェクトでは JSON の解析に `jq` を使います。

**代わりに jq を使ってください：**

```bash
# 例: ファイルから JSON を読み取る
cat file.json | jq '.key'

# 例: 配列の最初の要素を取得
cat file.json | jq '.[0]'

# 例: 特定のフィールドを抽出
cat file.json | jq '.[] | {number, title, state}'
```
