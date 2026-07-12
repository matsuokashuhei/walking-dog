#!/usr/bin/env bash
set -Eeuo pipefail

root="${PIN_ROOT_OVERRIDE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
dockerfile="$root/apps/api/Dockerfile"
compose="$root/infra/sakura/compose.yml"
runtime_root="$root/apps/api/tools/harness-runtime/src"
factory="$runtime_root/images.rs"
digest='@sha256:[0-9a-f]{64}'

head -n 1 "$dockerfile" | grep -Eq "^# syntax=[^[:space:]]+${digest}$" || {
  echo "unpinned Dockerfile syntax frontend" >&2; exit 1;
}
generic_images="$(perl -0777 -ne '
  while (/const\s+([A-Z0-9_]+_(?:NAME|TAG))\s*:\s*&str\s*=\s*"([^"]+)"/g) { $value{$1}=$2 }
  while (/GenericImage::new\s*\(\s*([A-Z0-9_]+)\s*,\s*([A-Z0-9_]+)\s*\)/g) { print "$value{$1}:$value{$2}\n" }
' "$factory")"
[[ -n "$generic_images" ]] || { echo "no Testcontainers images discovered" >&2; exit 1; }

while IFS= read -r file; do
  [[ "$file" == "$factory" ]] && continue
  if rg -n 'GenericImage::new|testcontainers::GenericImage[[:space:]]+as[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' "$file" >/dev/null; then
    echo "direct Testcontainers image construction outside approved factory: $file" >&2
    exit 1
  fi
done < <(find "$root/apps/api" -type f -name '*.rs' -not -path '*/target/*' -print)
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
