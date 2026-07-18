# Walk Session Idempotency

mutationの一意キーは`(user_id, operation, request_id)`です。最初の入力hashと結果を保存し、同じ入力の再送には同じ結果を返します。同じキーで異なる入力なら`IDEMPOTENCY_KEY_REUSED`です。

状態更新、idempotency結果、outbox eventは同一transactionで確定します。Trackへのstart/finalizeはWalkIdとoperation名をidempotency keyにします。
