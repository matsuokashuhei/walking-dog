# Identity Idempotency

- `requestId`の保存期間は24時間です。
- 同じUserまたはnormalized email、operation、requestIdの再送は同じ結果を返します。
- 同じrequestIdで異なるpayloadを送った場合は`IDEMPOTENCY_CONFLICT`です。
- OTP requestの再送で新しいemailを送信しません。
- verification成功後の再送は同じUserIdを返し、Userを追加作成しません。
- sign-out再送は既に失効済みでも成功です。

