#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmpdirs=()

make_tmpdir() {
  local var_name="$1" created_tmpdir
  created_tmpdir="$(mktemp -d)"
  tmpdirs+=("$created_tmpdir")
  printf -v "$var_name" '%s' "$created_tmpdir"
}

cleanup_tmpdirs() {
  ((${#tmpdirs[@]} == 0)) || rm -rf "${tmpdirs[@]}"
}

trap cleanup_tmpdirs EXIT

fail() {
  echo "not ok - $1" >&2
  exit 1
}

copy_sonar_scripts() {
  local target_root="$1"
  mkdir -p "$target_root/scripts/sonar"
  cp "$repo_root/scripts/sonar/run-analysis.sh" "$target_root/scripts/sonar/run-analysis.sh"
  cp "$repo_root/scripts/sonar/lcov-to-generic-coverage.sh" "$target_root/scripts/sonar/lcov-to-generic-coverage.sh"
  cp "$repo_root/scripts/sonar/normalize-clippy-report.sh" "$target_root/scripts/sonar/normalize-clippy-report.sh"
}

test_sonar_project_disables_scm_for_worktree_containers() {
  local properties
  properties="$(cat "$repo_root/sonar-project.properties")"

  [[ "$properties" == *"sonar.scm.disabled=true"* ]] || fail "expected sonar.scm.disabled=true for Docker scanner runs from git worktrees"
}

test_sonar_project_indexes_api_test_files_for_clippy_reports() {
  local properties
  properties="$(cat "$repo_root/sonar-project.properties")"

  [[ "$properties" == *"sonar.tests=apps/api/tests,apps/mobile"* ]] || fail "expected sonar.tests to include apps/api/tests for normalized Clippy diagnostics"
  [[ "$properties" == *"apps/api/tests/**/*.rs"* ]] || fail "expected Rust integration tests to be included as Sonar test files"
}

test_sonarqube_compose_binds_to_loopback() {
  local compose
  compose="$(cat "$repo_root/infra/sonarqube/compose.yml")"

  [[ "$compose" == *'127.0.0.1:${WD_SONARQUBE_PORT:-9000}:9000'* ]] || fail "SonarQube should bind to loopback for local-only use"
}

test_readme_lists_bash_validation_commands() {
  local readme
  readme="$(cat "$repo_root/scripts/sonar/README.md")"

  [[ "$readme" == *"bash scripts/sonar/run-analysis.test.sh"* ]] || fail "README should document the Bash Sonar test command"
  [[ "$readme" == *"bash -n scripts/sonar/*.sh"* ]] || fail "README should document Bash syntax validation"
}

test_normalizes_clippy_paths_for_sonar_sources() {
  local tmpdir output
  make_tmpdir tmpdir

  cat > "$tmpdir/clippy.json" <<'EOF'
{"reason":"compiler-message","message":{"rendered":"warning\n  --> src/service/auth.rs:10:5\n","spans":[{"file_name":"src/service/auth.rs","line_start":10}]}}
{"reason":"compiler-message","message":{"rendered":"warning\n  --> tests/auth_passwordless.rs:1:1\n","spans":[{"file_name":"tests/auth_passwordless.rs","line_start":1}]}}
EOF

  "$repo_root/scripts/sonar/normalize-clippy-report.sh" "$tmpdir/clippy.json" "$tmpdir/normalized.json"
  output="$(cat "$tmpdir/normalized.json")"

  [[ "$output" == *'"file_name":"apps/api/src/service/auth.rs"'* ]] || fail "expected src file_name to be prefixed for Sonar"
  [[ "$output" == *'"file_name":"apps/api/tests/auth_passwordless.rs"'* ]] || fail "expected tests file_name to be prefixed for Sonar"
  [[ "$output" == *'--> apps/api/src/service/auth.rs:10:5'* ]] || fail "expected rendered src path to be prefixed"
  [[ "$output" != *'"file_name":"src/'* ]] || fail "raw src file_name must not remain"
}

test_loads_sonar_host_url_from_local_env() {
  local tmpdir output status
  make_tmpdir tmpdir

  copy_sonar_scripts "$tmpdir"
  mkdir -p "$tmpdir/bin" "$tmpdir/scripts/sonar"
  cat > "$tmpdir/scripts/sonar/local.env" <<'EOF'
SONAR_HOST_URL=http://localhost:9000
SONAR_TOKEN=test-token
EOF

  cat > "$tmpdir/bin/node" <<'EOF'
#!/usr/bin/env bash
if [[ "${SONAR_HOST_URL:-}" == "http://localhost:9000" && "${SONAR_TOKEN:-}" == "test-token" ]]; then
  exit 42
fi
echo "unexpected sonar env: SONAR_HOST_URL=${SONAR_HOST_URL:-} SONAR_TOKEN=${SONAR_TOKEN:-}" >&2
exit 43
EOF
  chmod +x "$tmpdir/bin/node"

  set +e
  output="$(
    cd "$tmpdir" &&
      PATH="$tmpdir/bin:$PATH" "$tmpdir/scripts/sonar/run-analysis.sh" 2>&1
  )"
  status="$?"
  set -e

  [[ "$status" -eq 42 ]] || fail "expected script to load SONAR_HOST_URL before the first gate; status=$status output=$output"
  [[ "$output" != *"Missing SONAR_HOST_URL"* ]] || fail "did not expect missing SONAR_HOST_URL error"
}

test_resolves_repo_root_from_script_location() {
  local tmpdir outside output status
  make_tmpdir tmpdir
  make_tmpdir outside

  copy_sonar_scripts "$tmpdir"
  mkdir -p "$tmpdir/bin" "$tmpdir/scripts/sonar"
  cat > "$tmpdir/scripts/sonar/local.env" <<'EOF'
SONAR_HOST_URL=http://localhost:9000
SONAR_TOKEN=test-token
EOF

  cat > "$tmpdir/bin/node" <<'EOF'
#!/usr/bin/env bash
if [[ "$PWD" == "$EXPECTED_REPO_ROOT" && "${SONAR_HOST_URL:-}" == "http://localhost:9000" && "${SONAR_TOKEN:-}" == "test-token" ]]; then
  exit 42
fi
echo "unexpected cwd/env: PWD=$PWD EXPECTED_REPO_ROOT=${EXPECTED_REPO_ROOT:-} SONAR_HOST_URL=${SONAR_HOST_URL:-} SONAR_TOKEN=${SONAR_TOKEN:-}" >&2
exit 43
EOF
  chmod +x "$tmpdir/bin/node"

  set +e
  output="$(
    cd "$outside" &&
      EXPECTED_REPO_ROOT="$tmpdir" PATH="$tmpdir/bin:$PATH" "$tmpdir/scripts/sonar/run-analysis.sh" 2>&1
  )"
  status="$?"
  set -e

  [[ "$status" -eq 42 ]] || fail "expected script to cd to its repo root before running gates; status=$status output=$output"
}

test_rewrites_scanner_host_url_without_escape_characters() {
  local tmpdir output status scanner_url
  make_tmpdir tmpdir

  copy_sonar_scripts "$tmpdir"
  mkdir -p "$tmpdir/bin" "$tmpdir/scripts/sonar" "$tmpdir/apps/mobile"
  cat > "$tmpdir/scripts/sonar/local.env" <<'EOF'
SONAR_HOST_URL=http://localhost:9000
SONAR_TOKEN=test-token
EOF

  cat > "$tmpdir/bin/node" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
  chmod +x "$tmpdir/bin/node"

  cat > "$tmpdir/bin/npm" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
  chmod +x "$tmpdir/bin/npm"

  cat > "$tmpdir/bin/docker" <<'EOF'
#!/usr/bin/env bash
if [[ "$1" == "compose" ]]; then
  exit 0
fi

if [[ "$*" == *"cargo llvm-cov"* ]]; then
  mkdir -p "$PWD/.sonar/reports"
  cat > "$PWD/.sonar/reports/api-lcov.info" <<'LCOV'
TN:
SF:/walking-dog/apps/api/src/lib.rs
DA:1,1
end_of_record
LCOV
  exit 0
fi

if [[ "$*" == *"sonarsource/sonar-scanner-cli"* ]]; then
  for arg in "$@"; do
    case "$arg" in
      SONAR_HOST_URL=*)
        printf '%s' "${arg#SONAR_HOST_URL=}" > "$PWD/scanner-host-url.txt"
        ;;
    esac
  done
  exit 42
fi

exit 0
EOF
  chmod +x "$tmpdir/bin/docker"

  set +e
  output="$(
    cd "$tmpdir" &&
      PATH="$tmpdir/bin:$PATH" "$tmpdir/scripts/sonar/run-analysis.sh" 2>&1
  )"
  status="$?"
  set -e

  [[ "$status" -eq 42 ]] || fail "expected fake scanner to stop the script; status=$status output=$output"
  scanner_url="$(cat "$tmpdir/scanner-host-url.txt")"
  [[ "$scanner_url" == "http://host.docker.internal:9000" ]] || fail "unexpected scanner URL <$scanner_url>"
}

test_keeps_image_cargo_bin_available() {
  local script
  script="$(cat "$repo_root/scripts/sonar/run-analysis.sh")"

  [[ "$script" != *"apps_cargo_cache:/usr/local/cargo"* ]] || fail "must not mount over /usr/local/cargo because it hides cargo-llvm-cov from the image"
  [[ "$script" == *":/usr/local/cargo/registry"* ]] || fail "expected cargo registry cache mount"
  [[ "$script" == *":/usr/local/cargo/git"* ]] || fail "expected cargo git cache mount"
}

test_uses_sonar_image_for_coverage_tooling() {
  local dockerfile script dev_block
  dockerfile="$(cat "$repo_root/apps/api/Dockerfile")"
  script="$(cat "$repo_root/scripts/sonar/run-analysis.sh")"
  dev_block="$(awk '
    /^FROM base AS dev/ { in_dev = 1 }
    /^FROM / && $0 !~ /^FROM base AS dev/ && in_dev { exit }
    in_dev { print }
  ' "$repo_root/apps/api/Dockerfile")"

  [[ "$dev_block" != *"cargo-llvm-cov"* ]] || fail "normal API dev image should not install Sonar-only cargo-llvm-cov"
  [[ "$dev_block" != *"llvm-tools-preview"* ]] || fail "normal API dev image should not install Sonar-only llvm-tools-preview"
  [[ "$dockerfile" == *"FROM dev AS sonar"* ]] || fail "expected a Sonar-specific API image stage"
  [[ "$script" == *"--target sonar"* ]] || fail "run-analysis should build the Sonar-specific API image stage"
  [[ "$script" == *"apps-api-sonar"* ]] || fail "run-analysis should run Clippy and coverage in the Sonar-specific image"
}

test_uses_env_target_dir_for_cargo_llvm_cov() {
  local coverage_block
  coverage_block="$(awk '
    /^docker run \\/ {
      block = $0 ORS
      in_block = 1
      has_llvm_cov = 0
      next
    }
    in_block {
      block = block $0 ORS
      if ($0 ~ /cargo llvm-cov/) {
        has_llvm_cov = 1
      }
      if (has_llvm_cov && $0 ~ /--output-path/) {
        print block
        exit
      }
    }
  ' "$repo_root/scripts/sonar/run-analysis.sh")"

  [[ "$coverage_block" != *"--target-dir"* ]] || fail "cargo-llvm-cov does not support --target-dir; use CARGO_TARGET_DIR instead"
  [[ "$coverage_block" == *"CARGO_TARGET_DIR=/tmp/walking-dog-target"* ]] || fail "expected CARGO_TARGET_DIR for cargo-llvm-cov target cache"
}

test_limits_cargo_llvm_cov_to_test_targets() {
  local coverage_block
  coverage_block="$(awk '
    /^docker run \\/ {
      block = $0 ORS
      in_block = 1
      has_llvm_cov = 0
      next
    }
    in_block {
      block = block $0 ORS
      if ($0 ~ /cargo llvm-cov/) {
        has_llvm_cov = 1
      }
      if (has_llvm_cov && $0 ~ /--output-path/) {
        print block
        exit
      }
    }
  ' "$repo_root/scripts/sonar/run-analysis.sh")"

  [[ "$coverage_block" == *"--lib"* ]] || fail "expected cargo-llvm-cov to include library tests"
  [[ "$coverage_block" == *"--tests"* ]] || fail "expected cargo-llvm-cov to include integration tests"
  [[ "$coverage_block" == *"-j 1"* ]] || fail "expected cargo-llvm-cov to run with one job to reduce linker memory"
  [[ "$coverage_block" == *"-p walking-dog"* ]] || fail "expected cargo-llvm-cov to cover the API package, not every workspace package"
  [[ "$coverage_block" != *"--workspace"* ]] || fail "cargo-llvm-cov must not run unrelated workspace integration tests"
  [[ "$coverage_block" != *"--bins"* ]] || fail "cargo-llvm-cov must not force binary coverage targets"
}

test_sonar_project_disables_scm_for_worktree_containers
test_sonar_project_indexes_api_test_files_for_clippy_reports
test_sonarqube_compose_binds_to_loopback
test_readme_lists_bash_validation_commands
test_normalizes_clippy_paths_for_sonar_sources
test_loads_sonar_host_url_from_local_env
test_resolves_repo_root_from_script_location
test_rewrites_scanner_host_url_without_escape_characters
test_keeps_image_cargo_bin_available
test_uses_sonar_image_for_coverage_tooling
test_uses_env_target_dir_for_cargo_llvm_cov
test_limits_cargo_llvm_cov_to_test_targets
echo "ok - run-analysis Sonar checks passed"
