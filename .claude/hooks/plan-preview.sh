#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
if [[ "$FILE" == */.claude/plans/*.md ]]; then
  mo --no-open "$FILE"
fi
