# Track Recording Errors

| Code | Meaning |
| --- | --- |
| `TRACK_NOT_INITIALIZED` | WalkIdのTrackがない |
| `TRACK_NOT_RECORDING` | finalized等で追加不可 |
| `TRACK_ACCESS_DENIED` | Walk実行者ではない |
| `TRACK_BATCH_INVALID` | 件数、sequence、fieldが不正 |
| `TRACK_POINT_CONFLICT` | 同じsequenceに異なるpayloadがある |
| `TRACK_FINALIZATION_CONFLICT` | 異なる終了時刻でfinalize済み |
| `WALK_AUTHORIZATION_UNAVAILABLE` | Walk契約を検証できない |

point単位の距離除外はoperation失敗ではなく、ack内のrejection reasonとして返します。
