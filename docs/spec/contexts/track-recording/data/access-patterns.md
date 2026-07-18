# Track Recording Access Patterns

| Access | Key operation |
| --- | --- |
| Track状態取得 | `walk_id = WalkId`, `record_key = STATE` |
| point一件の重複確認 | `walk_id = WalkId`, `record_key = POINT#{sequence 12桁zero-pad}` |
| route page | Walk partitionを`begins_with(POINT#)`、昇順Query |
| summary取得 | `record_key = SUMMARY#{version 6桁zero-pad}` |
| idempotency取得 | `record_key = IDEMPOTENCY#{operation}#{requestId}` |
| 未配信outbox | `record_key = OUTBOX#{occurredAt}#{eventId}`を同一partitionでQuery |

全Walk横断の未配信outbox回収が必要な実装では、outbox専用streamまたは専用indexをplatform decisionとして追加します。scanを通常運用の前提にしません。
