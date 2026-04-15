# Lessons

各エントリは **パターン → なぜ → どう適用するか** で書く。

---

## 2026-04-15 — `include_str!` 静的検査だけでは完了条件にならない

**パターン**: リファクタリングの「Phase 完了条件」に runtime 検証 (integration test) を含めず、`include_str!` で本番コード文字列を grep する unit test だけで合格判定してはならない。

**なぜ**: Phase 4 (user_service upsert) で SeaORM の `try_insert` + `exec_with_returning` を採用したが、これは API 組み合わせバグ (`ON CONFLICT DO NOTHING` 衝突時に `RecordNotFound` 返却)。lib test (`include_str!` で `"duplicate key"` 文字列の不在を確認) は静的検査のため緑になったが、`test_authorization` 7件が runtime で全滅した。後続 Phase 5 が「pre-existing failure」と誤判定し、bug が 2 phase 跨いで隠蔽された。

**どう適用するか**:
- リファクタが production code path を変更する場合、その path を踏む **既存 integration test の緑化** または **新規 integration test の追加** を完了条件に必須化する
- `include_str!` / 静的検査は補助的ガード (再発防止) として使い、それ単独で「完了」を主張しない
- Phase 完了報告に「該当 integration test 名 + PASS 実績」を含める
- 「pre-existing failure」と判定する前に、変更直前のコミットで該当テストを実行して証拠を取る

**関連**: `tasks/refactor/api/03-plan.md` の各 Phase 完了条件、`tasks/refactor/api/progress.md` Phase 4 (commit `bf6484b` / `8160a5a`)

---

## 2026-04-15 — `let _ = expr.await;` (Question Mark なし) はエラー隠蔽

**パターン**: `Result` を返す async 式に対して `let _ = expr.await;` (Question Mark なし) を書いてはならない。`let _ = expr.await?;` (Question Mark 付き) なら **値** だけを破棄し DB エラー等は伝播するので OK。

**なぜ**: 修正コミット `bf6484b` で SeaORM の insert 系 API 戻り値全体を捨てていた。conflict だけでなく connection lost / permission denied / schema mismatch も黙殺されていた。CLAUDE.md「エラーを隠す回避策を提案しない」違反。

**どう適用するか**:
- 値を捨てたいだけなら `let _ = expr.await?;` (Result の Err は Question Mark で伝播)
- ライブラリ API が「特定 Err 種別だけ無視したい」設計を要求する場合は、ライブラリ側にその shorthand があるか先に探す (例: SeaORM の `on_conflict_do_nothing_on([col])` は `RecordNotInserted` だけ `Conflicted` にマップし他は `Err`)
- 静的ガード: `let _ = ` で始まり `.await;` で終わるパターンを grep / unit test で禁止 (現在は `user_service.rs` の `no_silent_error_swallowing_in_upsert` でガード)

**関連**: `apps/api/src/services/user_service.rs:tests::no_silent_error_swallowing_in_upsert`

---

## 2026-04-16 — `include_str!` 自己参照テストは即時 pass する

**パターン**: `#[cfg(test)] mod tests` 内で `include_str!("same_file.rs")` を使い、本番コードに特定文字列が存在/不在を assert するテストは、自分自身 (テストモジュール) も同じファイルに含まれるため assertion 文字列自体がヒットしてしまい RED/GREEN サイクルが破綻する。

**なぜ**: Phase 7 で `walk_event_service.rs` に「`verify_encounter_detection` 関数が存在する」を static guard として追加したところ、production 関数未実装の段階でも test 内の assertion 文字列 `"verify_encounter_detection"` が include_str! でヒットして即時 pass した。TDD の RED フェーズが成立せず、production 実装の有無を実質的に検証できない。

**どう適用するか**:
- 静的ガードテストは **別ファイル参照** に限定する (例: `walk_event_service.rs` から `include_str!("../services/encounter_service.rs")`)
- 自ファイルの構造を検証したい場合は、`proc-macro` / `syn` ベースの AST 検査か、runtime テスト (実際に関数を呼ぶ) に切り替える
- 「静的検査は補助ガード、単独で完了判定しない」の原則 (1つ目のレッスン) と合わせ、意味的検証は必ず integration test で担保

**関連**: Phase 7 commit `dcb273e` (自己参照 guard tests 削除)

---

## 2026-04-16 — worktree ベースの local main が stale だと Phase 間 conflict が発生する

**パターン**: `Agent(isolation: "worktree")` で作成される worktree は **local main の HEAD** から分岐する。local main が前回の PR squash merge 後に sync されていないと、worktree は古い base から分岐し、次の Phase を merge 済み Phase の上に載せた rebase でほぼ確実に conflict する。

**なぜ**: Phase 6 merge 後、local main は `260f380` (Phase 1-5 unsquashed) のまま残り、origin/main は `e99dddf` (Phase 6 squash) に進んでいた。Phase 7 worktree agent は local main から分岐したため Phase 6 の `auth_helpers` を見ずに `auth::require_auth` 直接呼び出しで実装。PR rebase で `custom_mutations.rs` conflict → PR 破棄 → redo が必要になった。

**どう適用するか**:
- **Phase 夫々の agent dispatch 前に必ず `git reset --hard origin/main`** で local main を origin に同期 (content equivalent のため非破壊)
- もしくは agent prompt に `base: origin/main` を明記し、agent 側で明示的 checkout させる
- worktree 作成後に `git log origin/main..HEAD` で base 一致を確認
- PR merge 後 `gh pr merge --delete-branch` が `fatal: 'main' is already used by worktree` で失敗するが remote merge 自体は成功する — `git ls-remote` で確認、手動で worktree/branch cleanup

**関連**: Phase 7 失敗 → PR #91 close → local main sync → PR #92 で redo
