# Identity Data Invariants

- UserId、provider+subject、normalized emailはそれぞれuniqueです。
- active Userはverified emailを持ちます。
- emailはtrim、Unicode control除去、lowercase後に保存します。
- status transitionはactiveからdisabledだけです。再有効化は新しいrevisionを伴う管理operationです。
- Outbox eventとUser mutationは同じtransactionです。
- challenge、OTP、access token、refresh tokenはPostgreSQLへ保存しません。
- PII削除後もevent IDとUserId tombstoneは重複防止期間中保持できます。
