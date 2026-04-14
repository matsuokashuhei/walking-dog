# Progress: api refactor

各 Phase 実行後に `[x]` + 日付 + コミットハッシュ + メモ を記録すること。

- [x] Phase 1: 定数化 (S3_PRESIGNED_URL_EXPIRY / DYNAMODB_BATCH_WRITE_LIMIT / INVITATION_EXPIRY) — 2026-04-15 — RED: f71b93d / GREEN: 3d9954e
- [ ] Phase 2: enum 化 (WalkStatus / WalkEventType / Period, SeaORM DeriveActiveEnum)
- [ ] Phase 3: 純粋関数抽出 (normalize_dog_pair / parse_birth_date_input)
- [ ] Phase 4: user_service upsert 統合 + duplicate key 文字列判定撲滅 (SeaORM on_conflict)
- [ ] Phase 5: Cognito エラー ProvideErrorMetadata::code() 化 + smithy mocks unit test
- [ ] Phase 6: walk_event_service 認可ハブ化 + auth_helpers 導入 (依存: Phase 4)
- [ ] Phase 7: encounter_service 責務集約 + verify_encounter_detection 新設 (依存: Phase 6)
- [ ] Phase 8: encounter N+M クエリ解消 JOIN 一括取得 (依存: Phase 7)
- [ ] Phase 9: GraphQL field-wise バリデーションエラー
- [ ] Phase 10: TEST_MODE → trait JwtVerifier 抽象化
- [ ] Phase 11: テスト基盤整備 tests/support/ 分離 + MockDatabase (依存: Phase 3, 7)
- [ ] Phase 12: sign_up facade 化 (依存: Phase 4)
- [ ] Phase 13: custom_mutations.rs ファイル分割 (依存: Phase 6,7,8,9,10,12)

## 推奨順

1 → 2 → (3/4/5/9/10 並列可) → 6 → 7 → 8 → 11 → 12 → 13
