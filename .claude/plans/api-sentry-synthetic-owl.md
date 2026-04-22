# Sentry 導入計画（Mobile + Rust API）

## Context
モバイルアプリ（Expo/React Native）と Rust/Axum API で発生したエラー・パニック・未キャッチ例外を Sentry に集約通知したい。現状：
- Mobile: グローバル Error Boundary なし、GraphQL エラーは `console.log` すら無い
- API: `tracing_subscriber::fmt::init()` の stdout ログのみ、エラーは async-graphql 経由で返るだけ

Sentry を選定した理由は、Mobile (`@sentry/react-native`) と Rust (`sentry` crate + `sentry-tower`) の両方に公式 SDK があり、release/user でクロスリンクできるため。無料プラン 5K errors/月で MVP には十分。

## Scope（分離した Sentry プロジェクト 2 つ）
- `walking-dog-mobile` (Platform: React Native)
- `walking-dog-api` (Platform: Rust)

DSN は環境ごとに分けず、`environment` タグで `local` / `development` / `production` を区別する。

---

## Worktree 運用

### 前提の再確認
- `apps/compose.yml` に `mobile` サービスは**存在しない** — Mobile は host 上で Expo CLI 直接起動
- `api` サービスの bind mount は `./api:/app`（`apps/compose.yml:46`）で compose ファイル相対パス → worktree 内から compose を起動すれば worktree 側ソースが自動で反映される
- したがって CLAUDE.md の「worktree を使わない」ルールの根拠（Mobile バインドマウント問題）は現行 Compose には該当しない

### セットアップ手順
```bash
git worktree add -b feat/sentry-integration .claude/worktrees/sentry-integration main
cd .claude/worktrees/sentry-integration
```

### Compose 並行実行の衝突回避
main リポジトリの compose が動いている場合に備え、worktree 側で起動するときは **project name を分離**する：
```bash
COMPOSE_PROJECT_NAME=walking-dog-sentry docker compose -f apps/compose.yml up api
```
ただし host port（3000, 5432, 8000, 4566, 9229）は衝突するため、実動作確認時は main 側 compose を `docker compose down` で停止してから worktree 側を起動する。`compose.override.yml` 追加は不要。

### PR 作成後
```bash
git worktree remove .claude/worktrees/sentry-integration
```

---

## Mobile 側（apps/mobile）

### パッケージ
- 追加: `@sentry/react-native`（`sentry-expo` は deprecated、RN 公式 SDK が Expo config plugin を内蔵）
- インストール: `cd apps/mobile && npm install --save @sentry/react-native`（host 実行、CLAUDE.md に従い Docker 経由ではなく直接）

> 注: memory `feedback_npm_docker.md` は npm を Docker 経由と指定しているが、`apps/compose.yml` に mobile サービスが無く Expo は host 実行のため、mobile の npm は host 側で扱う。セッション終了時に該当 memory を更新する。

### 新規ファイル
- **`apps/mobile/lib/monitoring/sentry.ts`** — `initSentry()`、`setSentryUser(user | null)`、`captureGraphQLError(err, ctx)` を export。`Sentry.init` の `dsn` / `environment` / `release` / `dist` / `tracesSampleRate: 0.1` / `enableAutoSessionTracking: true` / `beforeSend`（ペイロードから `accessToken` `refreshToken` を redact）を構成
- **`apps/mobile/lib/monitoring/sentry.test.ts`** — `beforeSend` の redact ロジックと `setSentryUser(null)` の scope クリアを検証

### 変更ファイル
| ファイル | 変更内容 |
|---|---|
| `apps/mobile/app.config.ts` (lines 52–106) | `plugins` 配列に `['@sentry/react-native/expo', { organization, project, url: 'https://sentry.io/' }]` を追加。`extra.sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? null` を追加 |
| `apps/mobile/app/_layout.tsx` | `initSentry()` をモジュールトップレベルで呼ぶ（既存 `useEffect` 外）。`export default Sentry.wrap(RootLayout)` で wrap（公式推奨、ErrorBoundary + TouchEventBoundary を自動注入） |
| `apps/mobile/stores/auth-store.ts` | `setUser` / `clearAuth` 時に `setSentryUser({ id, username })` / `setSentryUser(null)` を呼ぶ。`displayName` は PII 扱いを避けるため送らない |
| `apps/mobile/lib/providers.tsx` (QueryCache/MutationCache onError) | `captureGraphQLError` を呼ぶ。既存の 401 → `clearAuth` ロジックは保持、401 自体はキャプチャしない |
| `apps/mobile/jest.setup.ts` | `jest.mock('@sentry/react-native', () => ({ init: jest.fn(), wrap: (c) => c, setUser: jest.fn(), captureException: jest.fn(), ErrorBoundary: ({ children }) => children }))` を追加 |
| `apps/mobile/.env.local` / `.env.development` / `.env.production` | `EXPO_PUBLIC_SENTRY_DSN=...`（local は空文字で無効化） |

### 既存資産の再利用
- `apps/mobile/lib/graphql/errors.ts:3` `isNetworkError()` → `captureGraphQLError` で 5xx のみレポート、ネットワーク断は除外
- `apps/mobile/stores/auth-store.ts` の `user` は `{ id, username }` を保持済み → setUser へ直接渡せる
- `apps/mobile/lib/graphql/client.ts` の `refresh-on-401.ts` ミドルウェア → 401 は Sentry に送らない判断材料

### リリース追跡
- EAS Build 未導入のため source map アップロードは**今回はスキップ**。`release` は `app.config.ts` の `version` + `runtimeVersion` から合成。EAS 導入時に `@sentry/react-native/expo` plugin が自動アップロードする想定を README に注記

---

## API 側（apps/api）

### Cargo dependencies 追加（`apps/api/Cargo.toml`）
```toml
sentry = { version = "0.34", default-features = false, features = ["backtrace", "contexts", "panic", "tower", "tracing", "reqwest", "rustls"] }
sentry-tower = { version = "0.34", features = ["http"] }
sentry-tracing = "0.34"
```
※ `default-features = false` + `rustls` 指定は Docker image での openssl リンク回避

### 変更ファイル
| ファイル | 変更内容 |
|---|---|
| `apps/api/src/config.rs` (L19–51) | `Config` に `sentry_dsn: Option<String>`, `sentry_environment: String`, `sentry_traces_sample_rate: f32` を追加。`SENTRY_DSN` 未設定なら `None` で Sentry 無効化 |
| `apps/api/src/main.rs` (L6–46) | `#[tokio::main]` を外し、`fn main() -> anyhow::Result<()>` に変更。`let _sentry = init_sentry(&config);` を同期コンテキストで呼び、戻り値 `ClientInitGuard` を main 末尾までスコープ保持。その後 `tokio::runtime::Runtime::new()?.block_on(async { run(config).await })` |
| `apps/api/src/main.rs`（tracing 初期化） | `tracing_subscriber::fmt::init()` を廃止、`tracing_subscriber::registry().with(fmt_layer).with(EnvFilter).with(sentry_tracing::layer()).init()` に置換 |
| `apps/api/src/lib.rs` (`build_app()` L34–61) | `NewSentryLayer::new_from_top()` と `SentryHttpLayer::with_transaction()` を CORS の直後、auth middleware の前に挿入（Sentry scope が auth より外側になるように） |
| `apps/api/src/error.rs` (L11–56) | `AppError::Internal(e)` の `into_graphql_error` で `sentry::capture_error(&e)` を呼ぶ。`NotFound`, `Unauthorized`, `BadRequest`, `ValidationErrors` は送らない |
| `apps/api/src/auth/mod.rs` (`auth_middleware`) | 認証成功時に `sentry::configure_scope(|s| s.set_user(Some(User { id: Some(cognito_sub), ..Default::default() })))` |
| `apps/api/.env.local` / `.env.development` | `SENTRY_DSN=`、`SENTRY_ENVIRONMENT=local`、`SENTRY_TRACES_SAMPLE_RATE=0.1` |

### 既存資産の再利用
- `apps/api/src/error.rs` の `AppError::Internal` バリアント → そのまま capture 対象
- `apps/api/src/auth/mod.rs` の `cognito_sub` context 注入ロジック → Sentry user.id に流用

### テスト
- `apps/api/tests/support/client.rs` は `SENTRY_DSN` 未設定環境で動作するため変更不要（DSN 空時 `sentry::init` は no-op）
- 新規 `apps/api/tests/sentry_layer_test.rs`: `SentryHttpLayer` 付き Router で `/health` が 200 を返すことのみ確認

---

## 検証手順（E2E、worktree 内で実行）

### 事前準備
```bash
cd .claude/worktrees/sentry-integration
# main 側の compose が動いていれば停止
# 本物の DSN を .env.local に一時注入
```

### Mobile
1. `cd apps/mobile && npm start`（host 実行、worktree 側ソースで起動）
2. 一時的に throw ボタンを `app/(tabs)/dogs.tsx` に追加して発火
3. Sentry ダッシュボードで `walking-dog-mobile` / `environment: local` にイベント到着を確認
4. サインイン → イベントに `user.id` が付く
5. サインアウト → 後続イベントに `user` が付かない
6. スモークテスト用コードを削除

### API
1. `COMPOSE_PROJECT_NAME=walking-dog-sentry docker compose -f apps/compose.yml up api`
2. 一時的な panic resolver を追加して 500 発生
3. Sentry ダッシュボードで `walking-dog-api` にスタックトレース到着
4. 認証後リクエストでは `user.id` が Cognito sub で付く
5. スモークテスト用 resolver を削除

### 自動テスト
- Mobile: `cd apps/mobile && npm test`（Sentry モック化、副作用なし）
- API: `COMPOSE_PROJECT_NAME=walking-dog-sentry docker compose -f apps/compose.yml run --rm api cargo test --features test-utils`（DSN 空で no-op）

### 片付け
```bash
cd /Users/matsuokashuhei/Development/walking-dog
git worktree remove .claude/worktrees/sentry-integration
```

---

## 非対応（明示的に今回やらない）
- EAS Build + source map アップロード（EAS 導入時に別タスク）
- Performance monitoring のダッシュボード整備（`tracesSampleRate: 0.1` のみ設定）
- Release health / deploy tracking の CI 連携
- Slack/Email 通知ルーティング（Sentry 側で alert rule を手動設定）
- CLAUDE.md の「git worktree を使わない」ルール改訂（別 PR で提案）
