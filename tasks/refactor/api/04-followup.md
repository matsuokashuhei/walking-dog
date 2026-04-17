# Follow-up: api refactor

対象: `apps/api/` リファクタ Phase 1-13 完遂 (PR #87-#100 merged) 後に残した負債・検討事項。
日付: 2026-04-16

優先度: High / Medium / Low。High = 実害近接、Low = 運用で対処可能。

---

## 1. Docker target 削除不能 [Low]

**場所**: `.claude/worktrees/agent-a3e6c52e/apps/api/target` (旧 Phase 7 worktree 残骸)

**症状**: root 所有 + macOS Docker Desktop virtiofs 制約で `rm -rf` / docker 経由 `rm` どちらも permission denied。

**対処案**:
- A: `sudo rm -rf` で一括削除 (ユーザー手動)
- B: Docker コンテナ起動時に `--user $(id -u):$(id -g)` を付けて host ownership で cargo artifacts を作らせる (再発防止)
- C: 無視 (git worktree deregister 済、実害なし)

**推奨**: 次にユーザーが手動で A を 1 回実施、並行して apps/compose.yml 改修で B も検討。

---

## 2. CI disk 圧迫 (ubuntu-latest) [Medium]

**場所**: `.github/workflows/test-api.yml`

**症状**: Phase 6, 7 で CI リンカが "No space left on device" で失敗。ubuntu-latest の 14GB に対し Rust + AWS SDK full debug build が境界線。rerun で解消する時もあるが不安定。

**対処案**:
- A: `jlumbroso/free-disk-space@main` アクション追加 (~30GB 解放、5行程度)
- B: `Swatinem/rust-cache` 導入 (compile 時間 8→2min、ただし cache 10GB 上限でスコープに入れるか要検討)
- C: `cargo test --no-run` + `cargo test` 分割 + 中間 cleanup
- D: 専用 runner (self-hosted / larger instance)

**推奨**: A を最小労力で追加する PR。B は Step 2 として別 PR。

---

## 3. `NoOpJwtVerifier` が production code に公開 [Medium]

**場所**: `apps/api/src/auth/jwt.rs`

**症状**: Phase 10 で導入した test 用 verifier が本番バイナリに含まれる。実害無し (inject されない限り呼ばれない) だが、攻撃面拡大の可能性。

**対処案**:
- A: `#[cfg(any(test, feature = "test-utils"))]` gate + `Cargo.toml` に `test-utils` feature 定義、tests/ で `--features test-utils` 指定
- B: 別 crate (`api-test-support`) に切り出し、tests/ のみ依存
- C: 現状維持 (明示コメント付きで容認)

**推奨**: A が最小変更。Step: feature flag 追加 + integration test 走らせる際に `--features test-utils` 明示。

**ステータス**: DONE (PR #102, 2026-04-17)

---

## 4. sign_up 仕様変更 D 案の保留 [Low]

**場所**: Phase 12 (PR #99) で facade 化のみ実施、仕様変更は未実装

**内容**: `02-solutions.md` の D 案 — sign_up 時に DB profile を作成せず、**初回ログイン時に `get_or_create_user` 経由で作成** する設計。現状の facade (sign_up で Cognito + DB 同時作成) は仕様維持。

**検討ポイント**:
- メリット: Cognito 成功 / DB 失敗時の補償ロジック不要、get_or_create パターン一貫化
- デメリット: sign_up 時 display_name 受け取り先の再設計、既存モバイル flow への影響

**推奨**: 別セッションで UX / モバイルとの整合を整理してから判断。

---

## 5. encounter counterparty 検証セマンティクス [Low]

**場所**: `apps/api/src/services/walk_event_service.rs::verify_counterparty_encounter_detection`

**Phase 8 の実装**: counterparty walk の dog members のうち **1 人でも `encounter_detection_enabled=true`** なら encounter 記録許可。

**検討ポイント**: 旧 resolver トリプルループは「全員 enabled」必須 vs 「1人でも enabled でOK」どちらだったか要再確認。agent が N+M 解消時に行ったセマンティクス選択が意図通りか仕様側と突き合わせ必要。

**推奨**: モバイル / プロダクト側と決定の突き合わせ、ドキュメント追記。

---

## 実施優先順

1. **CI disk 最適化 (#2)** — 今後の PR 全てに効く、早期効果大
2. **`NoOpJwtVerifier` gate (#3)** — 小変更、security hygiene
3. **Docker target cleanup (#1)** — 手動 or compose user 指定、1 回で完結
4. **sign_up D 案 (#4)** — 仕様判断要、時期未定
5. **counterparty semantics (#5)** — 仕様突き合わせ、時期未定

`tasks/lessons.md` への追記は `#3` のみ (test helper 可視性のパターン化)。他は案件固有なので本ドキュメントで管理。
