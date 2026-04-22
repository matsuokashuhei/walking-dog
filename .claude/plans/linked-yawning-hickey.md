# Fix CI on PR #89 (feat/ios-live-activity-walk)

## Context

PR #89 の CI `Cargo Test` が失敗（`Jest` はpass）。原因は
`apps/api/src/graphql/mod.rs` の 3 関数 `walk_status_enum` /
`walk_event_type_enum` / `period_enum` が **2重定義** されている
こと（rustc E0428 "defined multiple times"）。

経緯:
- `main` の PR #87 (`0c9b3b1` refactor) がこの 3 関数を追加
- ブランチコミット `f3311b0` (Phase 2 enums) が同じ 3 関数を追加
- マージコミット `17c183a` でコンフリクト解消時に両方残したため
  行 11–32 と行 35–56 に連結複製された

両コピーは完全に同一。片方を削除すれば解消。

## Workspace

新規 worktree を作成済み:
`/Users/matsuokashuhei/Development/walking-dog/.claude/worktrees/fix-pr89-ci`

- worktree ブランチ `worktree-fix-pr89-ci` を `origin/feat/ios-live-activity-walk`
  の tip (17c183a) に hard reset 済み。
- 既存の worktree `.worktrees/feat/ios-live-activity` には
  ユーザーの iOS Live Activity の WIP があるため触らない。

## Fix Steps

1. `apps/api/src/graphql/mod.rs` の 行 33（空行）〜行 56（2つ目の
   `period_enum` 閉じ括弧）を削除する。1つ目の 10–32 行はそのまま。
   削除後は行 32 の `}` の直後に行 33（現行57）の空行が続く形。
2. `docker compose -f apps/compose.yml run --rm api cargo build` で
   ローカル build 確認。
3. `apps/api/src/graphql/mod.rs` だけ `git add` してコミット:
   ```
   fix(api): remove duplicate enum helpers from bad merge

   Merging main (#87) into feat/ios-live-activity-walk concatenated
   the enum helpers instead of dedup. Drop the second copy to
   resolve E0428.
   ```
4. `git push origin worktree-fix-pr89-ci:feat/ios-live-activity-walk`
   で PR ブランチに fast-forward push。
5. `gh pr checks 89 --watch` で Cargo Test が緑になるのを確認。

## Verification

- ローカル: `cargo build` (Docker経由) が成功
- CI: `Cargo Test` の conclusion が SUCCESS
- `git diff origin/feat/ios-live-activity-walk~1..HEAD` が
  `apps/api/src/graphql/mod.rs` の削除のみ

## Files Touched

`apps/api/src/graphql/mod.rs` のみ。
