#!/usr/bin/env python3
"""Guard hook — enforce environment-aware command policy.

In DevContainer (REMOTE_CONTAINERS=true): block `docker compose ...`, allow cargo etc.
On host OS: block direct `cargo ...`, require Docker Compose.

Exit codes:
  0 — allow
  2 — block (message becomes feedback to Claude)
"""

import json
import os
import re
import sys

# コマンド名 → ブロック時のメッセージ（DevContainer 外でのみ評価）
BLOCKED_COMMANDS: dict[str, str] = {
    r"cargo": (
        "Direct cargo commands are not allowed outside DevContainer. "
        "Use Docker Compose instead:\n"
        "  docker compose -f apps/compose.yml run --rm graphql cargo ..."
    ),
}


def main() -> None:
    data = json.load(sys.stdin)
    cmd = data.get("tool_input", {}).get("command", "")

    in_devcontainer = os.environ.get("REMOTE_CONTAINERS") == "true"
    is_docker_compose = re.search(r"docker\s+compose", cmd) is not None

    if in_devcontainer:
        # DevContainer 内: docker compose 経由は拒否、それ以外（cargo 直接含む）は許可
        if is_docker_compose:
            print(
                "DevContainer 内では docker compose 経由の実行は禁止されています。"
                "ローカルツールチェーン（例: cargo）を直接使用してください。",
                file=sys.stderr,
            )
            sys.exit(2)
        sys.exit(0)

    # DevContainer 外（ホスト OS）: docker compose 経由なら許可
    if is_docker_compose:
        sys.exit(0)

    for pattern, message in BLOCKED_COMMANDS.items():
        if re.match(rf"\s*({pattern})\s+", cmd):
            print(message, file=sys.stderr)
            sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
