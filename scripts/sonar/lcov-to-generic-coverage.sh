#!/usr/bin/env bash
set -Eeuo pipefail

strip_prefixes=()

usage() {
  echo "Usage: scripts/sonar/lcov-to-generic-coverage.sh [--strip-prefix PREFIX] <input.lcov> <output.xml>" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strip-prefix)
      if [[ $# -lt 2 ]]; then
        usage
        exit 2
      fi
      strip_prefixes+=("$2")
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --*)
      usage
      exit 2
      ;;
    *)
      break
      ;;
  esac
done

if [[ $# -ne 2 ]]; then
  usage
  exit 2
fi

input_path="$1"
output_path="$2"

xml_escape() {
  local value="$1"
  value="${value//&/&amp;}"
  value="${value//\"/&quot;}"
  value="${value//</&lt;}"
  value="${value//>/&gt;}"
  printf '%s' "$value"
}

normalize_path() {
  local path="$1"
  local prefix
  for prefix in "${strip_prefixes[@]}"; do
    if [[ "$path" == "$prefix"* ]]; then
      path="${path#"$prefix"}"
      break
    fi
  done
  printf '%s' "$path"
}

{
  echo '<coverage version="1">'

  in_file=0
  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    line="${raw_line%$'\r'}"
    [[ -z "$line" || "$line" == TN:* ]] && continue

    case "$line" in
      SF:*)
        if [[ "$in_file" -eq 1 ]]; then
          echo '  </file>'
        fi
        file_path="$(normalize_path "${line#SF:}")"
        printf '  <file path="%s">\n' "$(xml_escape "$file_path")"
        in_file=1
        ;;
      DA:*)
        if [[ "$in_file" -eq 1 ]]; then
          payload="${line#DA:}"
          line_number="${payload%%,*}"
          hits="${payload#*,}"
          hits="${hits%%,*}"
          covered=false
          if [[ "$hits" =~ ^[0-9]+$ && "$hits" -gt 0 ]]; then
            covered=true
          fi
          printf '    <lineToCover lineNumber="%s" covered="%s"/>\n' "$line_number" "$covered"
        fi
        ;;
      end_of_record)
        if [[ "$in_file" -eq 1 ]]; then
          echo '  </file>'
          in_file=0
        fi
        ;;
    esac
  done < "$input_path"

  if [[ "$in_file" -eq 1 ]]; then
    echo '  </file>'
  fi

  echo '</coverage>'
} > "$output_path"
