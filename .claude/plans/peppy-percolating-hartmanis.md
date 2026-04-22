# Plan: #2 CI disk 圧迫対策 + Dockerfile.dev に rustfmt 追加

## Context

`tasks/refactor/api/04-followup.md` 項目 #2 (Medium): Phase 6/7 CI で `Compiling walking-dog-api` の linker 段階で "No space left on device" 失敗が発生。ubuntu-latest runner の 14GB disk 境界が原因。rerun で通る不安定状態、本質的対策が必要。

合流項目: Dockerfile.dev に `rustup component add rustfmt` 追加 (前セッションで agent が `cargo-fmt is not installed` で fmt 検証 fail、dev container で直接 `cargo fmt` 実行可能化する需要あり)。

ユーザー選択: **D = A+B+C 全て** を **2 PR に分割** 実施。

## 分割方針

- **PR 1: CI disk 対策** — `.github/workflows/test-api.yml` (free-disk-space + rust-cache) + `apps/api/Cargo.toml` (`[profile.test]` tweak)
- **PR 2: dev container rustfmt 追加** — `apps/api/Dockerfile.dev`

分割理由: PR 1 は CI インフラ変更 (影響範囲 = CI runner のみ)、PR 2 は dev container rebuild 要件 (影響範囲 = 開発者環境)。CI 成功確認を PR 2 より先に得る。

---

## PR 1: CI disk 対策

### 変更ファイル

#### `/Users/matsuokashuhei/Development/walking-dog/.github/workflows/test-api.yml`

現状 (L22-L24): `Checkout` の直後に `Create DynamoDB table and S3 bucket` step。

**変更**:
1. `Checkout` step の直後に `jlumbroso/free-disk-space@main` step 挿入 (~30GB 解放)
2. その直後に `Swatinem/rust-cache@v2` step 挿入 (`workspaces` key を `apps/api` に設定、`shared-key` で cache scope 統一)

挿入例 (docker compose の compose.yml L26 の `up -d dynamodb-local localstack` より前):

```yaml
- name: Free disk space
  uses: jlumbroso/free-disk-space@main
  with:
    tool-cache: true
    android: false
    dotnet: false
    haskell: false
    large-packages: false
    swap-storage: false

- name: Rust cache
  uses: Swatinem/rust-cache@v2
  with:
    workspaces: apps/api -> target
    shared-key: test-api
```

注: rust-cache の `workspaces: apps/api -> target` は「`apps/api` workspace の `target` ディレクトリをキャッシュ」という意味。docker compose 経由実行では host 側の `apps/api/target` が named volume に紐づくため、rust-cache が正しく拾えるか要検証 (検証手順は下記)。万一 compose の named volume と競合する場合は rust-cache を PR 1 から除外して PR 1B (別 PR) に切り出す。

#### `/Users/matsuokashuhei/Development/walking-dog/apps/api/Cargo.toml`

現状: `[profile.*]` セクション無し (`[features]`, `[dependencies]`, `[dev-dependencies]` のみ)。

**変更**: ファイル末尾に以下を追加:

```toml
[profile.test]
debug = "line-tables-only"
```

効果: debug symbol size 30-50% 削減 → linker phase disk spike 軽減 (A の margin 増加)。

### 完了条件 / 検証

1. CI で `Test API` workflow PASS
2. workflow log 上で `Free disk space` step が `Total reclaimed: ~30 GB` 相当表示
3. `cargo test --features test-utils -- --test-threads=1` 全緑維持
4. rust-cache が期待通り cache hit or miss して compile 時間短縮確認 (初回は miss で OK)
5. rust-cache の `workspaces: apps/api -> target` が docker compose named volume と衝突していない (step succeeds without warnings)

### リスク / mitigation

| リスク | mitigation |
|---|---|
| rust-cache が docker compose target_cache named volume と競合 → cache 書き込み失敗 | compose volume が host 側 path にマウントされているか確認。競合時は rust-cache を PR 1 から除外し、PR 1B として後日検討 |
| free-disk-space が timeout / failure | `continue-on-error: true` で fallback 可能。ただし CI 不安定化を避けるため初期は false で確実に検証 |
| `[profile.test] debug = "line-tables-only"` が既存 test 挙動を変える | debug info のみ影響。test pass/fail には無関係。既存 test の全緑で担保 |

---

## PR 2: Dockerfile.dev に rustfmt 追加

### 変更ファイル

#### `/Users/matsuokashuhei/Development/walking-dog/apps/api/Dockerfile.dev`

現状 (L4): `RUN rustup component add clippy`

**変更**: L4 直後に以下を追加:

```dockerfile
RUN rustup component add rustfmt
```

または既存 clippy と合流:

```dockerfile
RUN rustup component add clippy rustfmt
```

(後者の方が layer 数少なく image size 最適)

### 完了条件 / 検証

1. `docker compose -f apps/compose.yml build api` でイメージ rebuild 成功
2. `docker compose -f apps/compose.yml run --rm api cargo fmt --check` が実行可能 (rustfmt not installed エラーが出ない)
3. `.claude/agents/inspector_ja.md` の `cargo fmt --check` checkbox が機能する (将来的な inspector 検査の blocker 解消)

### リスク / mitigation

| リスク | mitigation |
|---|---|
| image size 増加 (~20MB) | 単独 layer より clippy との合流で削減 |
| 既存 cargo fmt 違反が発覚 | PR 2 前に `chore(api): fix pre-existing cargo fmt violations` を別コミットで対応 (今回 PR #102 の chore と同様パターン)。事前 scan 必要 |

---

## 実施順序

1. **PR 1 先行** — CI disk 対策が最優先、項目 #2 解消の主目的
2. **PR 1 merge 確認後 PR 2** — dev container rebuild は PR 1 の CI 結果に影響しないが、順次で不具合切り分け容易化
3. 両 PR merge 後、`tasks/refactor/api/04-followup.md` 項目 #2 に DONE ステータス追記 (PR 2 の末尾コミット or 別 small PR)

---

## 既存資産の再利用

- **既存 workflow** `.github/workflows/test-api.yml` の構造 (docker compose 依存) 維持
- **既存 Dockerfile.dev** の `rustup component add clippy` パターンに rustfmt 合流
- **PR #102 の手法** (chore commit で pre-existing 違反修正) を PR 2 の fmt 違反対応で踏襲

## Critical Files

- PR 1:
  - `/Users/matsuokashuhei/Development/walking-dog/.github/workflows/test-api.yml`
  - `/Users/matsuokashuhei/Development/walking-dog/apps/api/Cargo.toml`
- PR 2:
  - `/Users/matsuokashuhei/Development/walking-dog/apps/api/Dockerfile.dev`
- 参照のみ (変更なし):
  - `/Users/matsuokashuhei/Development/walking-dog/.github/workflows/deploy-api.yml` (対策不要、既に GHA cache 使用)
  - `/Users/matsuokashuhei/Development/walking-dog/apps/compose.yml` (named volume 設定確認用)
  - `/Users/matsuokashuhei/Development/walking-dog/tasks/refactor/api/04-followup.md` 項目 #2 (出発点)

## Verification (PR 1)

```bash
# CI 実行を trigger (push 後)
gh pr checks <pr-1-number>

# 成功時の log 確認 (例)
gh run view --log-failed <run-id>  # 失敗時
gh run view <run-id>  # 成功時

# rust-cache の cache hit/miss 確認
# workflow log 内 "Cache hit" or "Cache not found" message を grep
```

## Verification (PR 2)

```bash
# local で image rebuild
docker compose -f apps/compose.yml build --no-cache api

# rustfmt 動作確認
docker compose -f apps/compose.yml run --rm api cargo fmt --check
# 期待: 違反無しなら no output、あればリスト出力

# 既存 integration test が rebuild 後も緑維持
docker compose -f apps/compose.yml run --rm api cargo test --features test-utils -- --test-threads=1
```

---

## OOS (本プランの対象外)

- self-hosted runner 導入 (Option D)
- sccache / cargo-chef 等の advanced caching
- `cargo test --no-run` 分割 (効果無い判定)
- `.github/workflows/deploy-api.yml` 変更 (既に cache 有効)
- test-mobile.yml / e2e 配下の disk 対策 (リスク低)
- `tests/support/` の fmt 違反自動検知 (既に PR #102 の chore で対処済)
