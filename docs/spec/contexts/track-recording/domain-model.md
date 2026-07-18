# Track Recording Domain Model

## Track

WalkIdごとに一つのTrackを持ちます。Trackは`initializing`、`recording`、`finalizing`、`finalized`の状態を持ちます。

## TrackPoint

| Field | Rule |
| --- | --- |
| sequence | 1から始まる端末採番。Walk内で一意 |
| recordedAt | 端末が測位したUTC時刻 |
| latitude / longitude | WGS84の有効範囲 |
| horizontalAccuracyMeters | 0以上の測位精度 |
| altitudeMeters | 任意 |
| speedMetersPerSecond | 任意、0以上 |
| source | `foreground`または`background` |
| acceptedForDistance | 距離算入の判定結果 |
| rejectionReason | 除外時の説明 |

## TrackSummary

version、distanceMeters、acceptedPointCount、rejectedPointCount、first/lastRecordedAt、finalizedAtを持つimmutable snapshotです。
