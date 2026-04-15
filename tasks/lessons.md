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
