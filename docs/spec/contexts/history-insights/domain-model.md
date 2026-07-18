# History & Insights Domain Model

## Read Models

| Model | Purpose |
| --- | --- |
| WalkHistoryItem | 完了散歩の一覧行 |
| WalkDetail | snapshot、metrics、timeline、Media/Track参照 |
| UserLifetimeStats | walk count、distance、duration、参加犬数 |
| UserWeeklyStats | 利用者timezoneの月曜から日曜までの日別集計 |
| DogLifetimeStats | 犬ごとのwalk count、distance、duration |
| DogGoalProgress | 有効な日次または週次目標に対するminutes |
| ProjectionFreshness | 最終処理event時刻、状態、欠損の有無 |

## Snapshot Semantics

散歩詳細の犬名と実行者表示名は散歩時点のsnapshotです。現在のDog/Profileを上書き参照して過去表示を変えません。avatarはAssetIdを保持し、表示時にMedia Catalogからdelivery URLを得ます。

## Ordering

一覧は`completedAt DESC, walkId DESC`です。timelineは`occurredAt ASC, eventId ASC`です。同日時でも識別子で決定的に並べます。
