# Permissions — Allow / Deny Tool Sets

`copilot -p` 呼び出し時の `--allow-tool` / `--deny-tool` 推奨セット。
言語・フレームワークごとに異なる。

## Common (全モード・全言語共通)

必ず付ける：

```bash
# Allow
--allow-tool='write'
--allow-tool='shell(git:add)'
--allow-tool='shell(git:status)'
--allow-tool='shell(git:diff)'
--allow-tool='shell(git:log)'
--allow-tool='shell(git:commit)'
--allow-tool='shell(git:checkout)'
--allow-tool='shell(git:branch)'
--allow-tool='shell(git:restore)'
--allow-tool='shell(cat)'
--allow-tool='shell(ls)'
--allow-tool='shell(mkdir)'
--allow-tool='shell(find)'
--allow-tool='shell(grep)'

# Deny — 全モードで絶対禁止
--deny-tool='shell(git push)'
--deny-tool='shell(git push:*)'
--deny-tool='shell(rm:-rf)'
--deny-tool='shell(sudo)'
--deny-tool='shell(curl)'           # 外部送信を防ぐ
--deny-tool='shell(wget)'
--deny-tool='shell(scp)'
--deny-tool='shell(ssh)'
```

注: `--deny-tool` の構文は Copilot CLI のバージョンで `shell(git push)` か `shell(git:push)` か差がある。`copilot --help` で実機の構文を確認してから書く。

---

## Rust (apps/api)

`cargo` 直叩きを禁止し Docker Compose 経由を強制する。

```bash
# Allow
--allow-tool='shell(docker:compose:*)'
--allow-tool='shell(docker:*)'

# Deny — cargo 直叩きは禁止（feedback_rust_docker memory 遵守）
--deny-tool='shell(cargo:*)'
--deny-tool='shell(rustc)'
--deny-tool='shell(rustup)'
```

タスク説明には必ず明記：
> ビルド・テストは `docker compose run --rm api cargo build` / `cargo test` のように **Docker Compose 経由のみ**。ホスト直 `cargo` 実行は禁止。

---

## TypeScript / React Native (apps/mobile, apps/web)

`npm` は Docker 経由が原則だがモバイルは Expo の都合で例外あり。

```bash
# Allow
--allow-tool='shell(npm:*)'
--allow-tool='shell(npx:*)'
--allow-tool='shell(node:*)'
--allow-tool='shell(yarn:*)'         # 念のため
--allow-tool='shell(tsc:*)'

# Deny — モバイルの secure-store 不一致防止
--deny-tool='shell(expo:prebuild)'   # APP_ENV 漏れ防止、prebuild は Claude 側で実行
```

タスク説明に必ず明記:
> - `apps/mobile/theme/tokens.ts` のトークンを使う。magic number 直書き禁止。値がなければトークンを追加してから使う。
> - 認証は Rust API 経由。`@aws-amplify/auth` 等で Cognito に直接通信しない。

---

## Terraform (infra)

ローカルに Terraform がインストールされていないため、Docker (`hashicorp/terraform:1.14`) 経由のみ。

```bash
# Allow
--allow-tool='shell(docker:*)'
--allow-tool='shell(terraform:fmt)'    # fmt のみ host で許可（安全）

# Deny — host 直 terraform は禁止（feedback_terraform_docker memory 遵守）
--deny-tool='shell(terraform:init)'
--deny-tool='shell(terraform:plan)'
--deny-tool='shell(terraform:apply)'
--deny-tool='shell(terraform:destroy)'
```

タスク説明に必ず明記:
> Terraform コマンドは `docker run --rm -v $(pwd):/work -w /work hashicorp/terraform:1.14 plan` のように Docker 経由で。`apply` / `destroy` は **Copilot から実行禁止、Claude が最終確認後にユーザーへ伺いを立てる**。

---

## URL / Network

```bash
# Allow (必要に応じて)
--allow-url='github.com'
--allow-url='registry.npmjs.org'
--allow-url='crates.io'

# Deny
--deny-url='*'                         # 上記以外は禁止
```

タスクが外部 API ドキュメントを参照する必要があるときのみ、追加で `--allow-url` を加える。

---

## まとめ — Mode × Language マトリクス

| Mode \ Language | Common | + Rust | + TS | + Terraform |
|---|---|---|---|---|
| parallel | ✓ | task ごとに切替 | task ごとに切替 | task ごとに切替 |
| single | ✓ | 適用 | 適用 | 適用 |
| second-opinion | ✓ | 適用 | 適用 | 適用 |

実装時は **Common + Language** を文字列連結して `copilot -p` に渡す。
