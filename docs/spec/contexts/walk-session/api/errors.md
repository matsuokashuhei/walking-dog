# Walk Session Errors

| Code | Meaning |
| --- | --- |
| `WALK_ALREADY_IN_PROGRESS` | 同じUserに進行中Walkがある |
| `WALK_NOT_FOUND` | 存在しないか閲覧権限がない |
| `DOG_NOT_WALK_ELIGIBLE` | 犬がinactiveまたは権限なし |
| `WALK_STATE_CONFLICT` | 現在状態では操作不可 |
| `WALK_VERSION_CONFLICT` | expectedVersion不一致 |
| `WALK_EVENT_INVALID` | 種別、時刻、位置が不正 |
| `WALK_MEDIA_INVALID` | Assetのowner、purpose、statusが不正 |
| `TRACK_INITIALIZATION_FAILED` | Track開始を確定できない |
| `TRACK_FINALIZATION_FAILED` | Track終了を確定できない |

一時的な依存先障害はretryableとして返し、成功に見せかけません。
