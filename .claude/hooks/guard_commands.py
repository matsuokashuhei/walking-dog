#!/usr/bin/env python3
"""Guard hook — block direct npm/npx/cargo/playwright-cli commands, require Docker Compose.

Exit codes:
  0 — allow
  2 — block (message becomes feedback to Claude)
"""

import json
import re
import sys

# コマンド名 → ブロック時のメッセージ
BLOCKED_COMMANDS: dict[str, str] = {
    # r"npm|npx": (
    #     "Direct npm/npx commands are not allowed. "
    #     "Use Docker Compose instead:\n"
    #     "  docker compose -f apps/compose.yml run --rm mobile npm ...\n"
    #     "  docker compose -f apps/compose.yml run --rm mobile npx ..."
    # ),
    r"cargo": (
        "Direct cargo commands are not allowed. "
        "Use Docker Compose instead:\n"
        "  docker compose -f apps/compose.yml run --rm api cargo ..."
    ),
    r"playwright-cli": (
        "Direct playwright-cli commands are not allowed. "
        "Use Docker Compose instead:\n"
        "  docker compose -f apps/compose.yml run --rm e2e playwright-cli ..."
    ),
}


def main() -> None:
    data = json.load(sys.stdin)
    cmd = data.get("tool_input", {}).get("command", "")

    # docker compose 経由なら許可
    if re.search(r"docker\s+compose", cmd):
        sys.exit(0)

    for pattern, message in BLOCKED_COMMANDS.items():
        if re.match(rf"\s*({pattern})\s+", cmd):
            print(message)
            sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
