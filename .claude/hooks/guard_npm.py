#!/usr/bin/env python3
"""Guard hook — block direct npm/npx commands, require Docker Compose.

Exit codes:
  0 — allow
  2 — block (stderr becomes feedback to Claude)
"""

import json
import re
import sys


def main() -> None:
    data = json.load(sys.stdin)
    cmd = data.get("tool_input", {}).get("command", "")

    # docker compose 経由なら許可
    if re.search(r"docker\s+compose", cmd):
        sys.exit(0)

    # 直接の npm/npx をブロック
    if re.match(r"\s*(npm|npx)\s+", cmd):
        print(
            "Direct npm/npx commands are not allowed. "
            "Use Docker Compose instead:\n"
            "  docker compose -f apps/compose.yml run --rm mobile npm ...\n"
            "  docker compose -f apps/compose.yml run --rm mobile npx ..."
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
