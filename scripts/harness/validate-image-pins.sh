#!/usr/bin/env bash
set -Eeuo pipefail

root="${PIN_ROOT_OVERRIDE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
dockerfile="$root/apps/api/Dockerfile"
compose="$root/infra/sakura/compose.yml"
runtime="$root/apps/api/tools/harness-runtime/src/lib.rs"
digest='@sha256:[0-9a-f]{64}'

head -n 1 "$dockerfile" | grep -Eq "^# syntax=[^[:space:]]+${digest}$" || {
  echo "unpinned Dockerfile syntax frontend" >&2; exit 1;
}
generic_images="$(perl -0777 -ne 'while (/GenericImage::new\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g) { print "$1:$2\n" }' "$runtime")"
[[ -n "$generic_images" ]] || { echo "no Testcontainers images discovered" >&2; exit 1; }
while IFS= read -r reference; do
  [[ "$reference" =~ ^[^[:space:]]+${digest}$ ]] || {
    echo "unpinned Dockerfile FROM: $reference" >&2; exit 1;
  }
done < <(awk '
  /^FROM / {
    image=$2
    if (!(image in aliases)) print image
    for (i=3; i<=NF; i++) {
      if (toupper($i) == "AS" && i < NF) aliases[$(i+1)]=1
    }
  }
' "$dockerfile")

while IFS= read -r reference; do
  [[ "$reference" == '${ECR_IMAGE}' ]] && continue
  [[ "$reference" =~ ^[^[:space:]]+${digest}$ ]] || {
    echo "unpinned Compose image: $reference" >&2; exit 1;
  }
done < <(sed -n 's/^[[:space:]]*image:[[:space:]]*//p' "$compose")

while IFS= read -r reference; do
  [[ "$reference" =~ ^[^[:space:]]+${digest}$ ]] || {
    echo "unpinned Testcontainers image: $reference" >&2; exit 1;
  }
done <<< "$generic_images"
