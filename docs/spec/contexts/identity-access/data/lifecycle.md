# Identity Data Lifecycle

- OTP/challenge: Cognito managed、10分で失効
- idempotency result: 24時間
- active User mapping: account lifetime
- disabled User mapping: security auditとre-registration policyのため保持
- Outbox payload: publication確認後90日でarchive可能
- raw token、OTP、provider session: persistent storage禁止

User deletion仕様を追加する場合は、IdentityがUserDisabledを先に発行し、consumer deletion acknowledgement後にPIIを消去します。初期仕様はself-service account deletionを提供しません。
