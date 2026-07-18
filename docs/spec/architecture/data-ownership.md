# Data Ownership

## Ownership Matrix

| Context | Canonical data |
| --- | --- |
| Identity & Access | users、external identity mapping、email state |
| User Profile | user profiles、preferences |
| Dog Management | dogs、user-dog roles、time-based goals |
| Walk Session | walks、participants、events、completion metadata、media references |
| Track Recording | ordered track points、ingestion state、distance summaries |
| History & Insights | rebuildable history and metric projections |
| Media | media assets、upload state、object records |

## Physical Isolation

初期運用で同じPostgreSQL instanceを共有しても、contextごとにschemaとdatabase principalを分離します。各principalには自schema以外の権限を与えません。DynamoDB Track PointはTrack Recording、S3-compatible objectsはMediaだけが操作します。

## External References

他contextのIDはUUIDとして保存できますが、外部キーを張りません。参照の有効性はprovider APIまたは受信eventで確認し、削除はtombstone eventとlocal policyで処理します。

## Canonical Formats

- PostgreSQL: context-owned `schema.sql`
- Cognito: Identity-owned `cognito-user-pool.yaml`
- DynamoDB: Track-owned `dynamodb-table.yaml`と`item-schema.json`
- Object storage: Media-owned `object-schema.yaml`と`storage-policy.md`
- Integration events: provider-owned versioned schemas
