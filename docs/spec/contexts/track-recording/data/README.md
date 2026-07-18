# Track Recording Data

Track Recordingは専用DynamoDB tableを所有します。partition keyは`walk_id`、sort keyは`record_key`です。raw point、track state、summary、idempotency、outboxを同じWalk partition内に配置し、他contextへtable accessを公開しません。

Walk SessionのPostgreSQLへpointを保存せず、Historyへraw pointを複製しません。経路はTrack queryを通して提供します。
