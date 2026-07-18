# Dog Management Idempotency

- register request ID再送は同じDogIdを返します。
- update、remove、goal request ID再送は同じrevision resultを返します。
- request IDを別Dog/payloadへ再利用すると`IDEMPOTENCY_CONFLICT`です。
- removed Dogのremove再送は成功です。
- eventはaggregate revisionごとに一つです。

