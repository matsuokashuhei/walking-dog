---
name: block-terraform
enabled: true
event: bash
action: block
conditions:
  - field: command
    operator: regex_match
    pattern: ^\s*terraform\s+
---

**terraform コマンドの直接実行はブロックされました。**

このプロジェクトでは terraform をホストで直接実行せず、Docker 経由で実行してください。

**使用方法:**
```
docker run --rm -v $(pwd):/workspace -w /workspace hashicorp/terraform:1.14 <command>
```

**例:**
- `docker run --rm -v $(pwd):/workspace -w /workspace hashicorp/terraform:1.14 init`
- `docker run --rm -v $(pwd):/workspace -w /workspace hashicorp/terraform:1.14 plan`
- `docker run --rm -v $(pwd):/workspace -w /workspace hashicorp/terraform:1.14 apply`
