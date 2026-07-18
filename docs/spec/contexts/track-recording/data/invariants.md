# Track Recording Data Invariants

- WalkIdごとにstate itemは一件です。
- point sequenceは正整数で、同じsequenceのcanonical payloadは不変です。
- accepted/rejectedの判定と理由を保存し、都合の悪いpointを削除しません。
- finalized summaryはimmutableかつversionedです。
- state遷移、summary、outboxはDynamoDB transactionで一体に確定します。
- consumerはtable schemaでなくAPI/event contractへ依存します。
