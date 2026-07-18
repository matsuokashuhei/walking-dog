# History & Insights Errors

| Code | Meaning |
| --- | --- |
| `HISTORY_NOT_FOUND` | 対象がない、または閲覧不可 |
| `HISTORY_CURSOR_INVALID` | cursorが不正、期限切れ、filter不一致 |
| `HISTORY_TIME_ZONE_INVALID` | IANA timezoneでない |
| `HISTORY_PROJECTION_INCOMPLETE` | 必須event欠損で正しい値を返せない |
| `HISTORY_ROUTE_UNAVAILABLE` | Track routeだけ取得不可 |
| `HISTORY_MEDIA_UNAVAILABLE` | Media URLだけ取得不可 |

依存sectionの一時障害はpartial errorとして返せる一方、必須metrics欠損は成功値0に変換しません。
