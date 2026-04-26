#!/bin/sh

PORT=8081

find_pids() {
  lsof -tiTCP:${PORT} -sTCP:LISTEN 2>/dev/null || true
}

pids="$(find_pids)"

if [ -z "$pids" ]; then
  echo "No Metro process listening on :${PORT}"
  exit 0
fi

echo "Stopping Metro on :${PORT} (PID: $(printf '%s' "$pids" | tr '\n' ' ' | sed 's/ $//'))"
kill $pids 2>/dev/null || true

remaining="$(find_pids)"
if [ -n "$remaining" ]; then
  echo "Force stopping Metro on :${PORT} (PID: $(printf '%s' "$remaining" | tr '\n' ' ' | sed 's/ $//'))"
  kill -9 $remaining 2>/dev/null || true
fi

final_pids="$(find_pids)"
if [ -n "$final_pids" ]; then
  echo "Failed to stop Metro on :${PORT} (PID: $(printf '%s' "$final_pids" | tr '\n' ' ' | sed 's/ $//'))" >&2
  exit 1
fi

echo "Metro stopped on :${PORT}"
