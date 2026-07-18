# User Profile Domain Model

## User Profile

| Field | Type | Rule |
| --- | --- | --- |
| `user_id` | UUID | Identity-issued ID、primary key |
| `display_name` | string | trim後1〜80 grapheme、control character禁止 |
| `avatar_asset_id` | UUID? | ready `user_avatar` MediaAssetId |
| `version` | integer | optimistic concurrency |

emailはIdentity、walk statisticsはHistory、image bytesはMediaが所有します。

## User Preferences

| Field | Values |
| --- | --- |
| `locale` | `ja-JP`、`en-US` |
| `unit_system` | `metric`、`imperial` |
| `appearance` | `system`、`light`、`dark` |
| `notifications_enabled` | boolean |

## Invariants

- `USR-010`: UserIdごとにProfileとPreferencesは最大一つです。
- `USR-011`: avatarは同じUser所有のready `user_avatar`だけです。
- `USR-012`: email、phone、location、bio、sharing state、achievementはProfile dataに含めません。
- `USR-013`: updateはexpected version一致時だけ成功します。
