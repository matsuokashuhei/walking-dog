# Progress: api refactor

各 Phase 実行後に `[x]` + 日付 + コミットハッシュ + メモ を記録すること。

- [x] Phase 1: 定数化 (S3_PRESIGNED_URL_EXPIRY / DYNAMODB_BATCH_WRITE_LIMIT / INVITATION_EXPIRY) — 2026-04-15 — RED: f71b93d / GREEN: 3d9954e
- [x] Phase 2: enum 化 (WalkStatus / WalkEventType / Period, SeaORM DeriveActiveEnum) — 2026-04-15 — RED: f224fcb / GREEN: f3311b0
- [x] Phase 3: 純粋関数抽出 (normalize_dog_pair / parse_birth_date_input) — 2026-04-15 — RED: a9f3491/93b3339 / GREEN: 8818ea1/251109e
- [x] Phase 4: user_service upsert 統合 + duplicate key 文字列判定撲滅 (SeaORM on_conflict) — 2026-04-15 — RED: 92c3a6b / GREEN: ca059a5 — FIX: bf6484b (test_authorization runtime bug) — HARDEN: 8160a5a (proper DbErr propagation)
- [x] Phase 5: Cognito エラー ProvideErrorMetadata::code() 化 + smithy mocks unit test — 2026-04-15 — RED: ee4b315 / GREEN: e129a62
- [x] Phase 6: walk_event_service 認可ハブ化 + auth_helpers 導入 (依存: Phase 4) — 2026-04-15 — RED→GREEN: 1c9360d / GREEN: e295f75, 888b2b0, cf8ce84
- [x] Phase 7: encounter_service 責務集約 + verify_encounter_detection 新設 (依存: Phase 6) — 2026-04-15 — RED: ea49c80 / GREEN: cb5f112 — CLEANUP: dcb273e (remove self-referential static guards) / FMT: 58077bc — verify_encounter_detection in walk_event_service; acting_user_id added to record_encounter + update_encounter_duration; update_encounter_duration_field slim 46→25 lines; record_encounter_field counterparty loop retained (Phase 8)
- [x] Phase 8: encounter N+M クエリ解消 JOIN 一括取得 (依存: Phase 7) — 2026-04-15 — RED: f1b00c5 / GREEN: 03837cb — CLEANUP: 361866f (remove self-referential static guard) — verify_counterparty_encounter_detection added to walk_event_service (3 fixed queries: walk_dogs IN, dog_members IN, users IN+filter); encounter_service::record_encounter calls it; record_encounter_field triple-nested loop (29 lines) deleted; SQL log confirms O(N×M) → 3 fixed queries
- [x] Phase 9: GraphQL field-wise バリデーションエラー — 2026-04-15 — RED(error.rs): 6afd58d / GREEN(error.rs): f06396e / RED(integration): 83b3f79 / GREEN(resolvers): 0f955d2 — FieldError struct + ValidationErrors variant + into_graphql_error extensions.fields; record_encounter_field + add_walk_points_field UUID parse ? → accumulation; test_record_encounter_invalid_both_uuids_returns_field_errors integration test added
- [x] Phase 10: TEST_MODE → trait JwtVerifier 抽象化 — 2026-04-15 — RED: 3f558a6 / GREEN: 1cb07e2 — JwtVerifier trait + CognitoJwtVerifier + NoOpJwtVerifier in auth/jwt.rs; TEST_MODE branch removed from middleware; tests inject NoOpJwtVerifier; production binary: TEST_MODE 0 hits
- [x] Phase 11: テスト基盤整備 tests/support/ 分離 + MockDatabase (依存: Phase 3, 7) — 2026-04-16 — REFACTOR: 9e25fe8 / RED: 74ddb92 / GREEN: 1f4732d — tests/common/mod.rs → tests/support/{mod.rs,client.rs,tokens.rs,fixtures.rs}; #[allow(dead_code)] 0 hits; 6 new MockDatabase tests (encounter×3, walk×3); cargo test --lib: 60 passed
- [x] Phase 12: sign_up facade 化 (依存: Phase 4) — 2026-04-16 — RED: 8efa063 / GREEN: 44f8081 — sign_up_with_profile in auth::service (Cognito sign_up + create_user_with_profile); sign_up_field slim 34→28 lines (inner async body 19 lines); create_user_with_profile kept (now called from auth::service); clippy redundant-closure in jwt.rs fixed; test_user + test_sharing_flow PASS
- [ ] Phase 13: custom_mutations.rs ファイル分割 (依存: Phase 6,7,8,9,10,12)

## 推奨順

1 → 2 → (3/4/5/9/10 並列可) → 6 → 7 → 8 → 11 → 12 → 13
