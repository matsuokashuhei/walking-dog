# Dog Management Domain Model

## Dog

| Field | Rule |
| --- | --- |
| `dog_id` | opaque UUID |
| `name` | trim後1〜80 grapheme、同名を許可 |
| `breed` | optional、trim後1〜120 grapheme |
| `gender` | `female`、`male`、`other` |
| `birthday` | optional date、未来不可、40年前より古くない |
| `avatar_asset_id` | optional ready `dog_avatar` MediaAssetId |
| `status` | `active`、`removed` |
| `version` | optimistic concurrency |

## User-Dog Role

`user_dog_roles`はUserId、DogId、roleを結びます。roleは`owner`または`walker`です。初期UIはowner作成だけを提供し、招待・role管理UIは初期scope外です。

## Walk Goal

| Field | Rule |
| --- | --- |
| `minutes` | 1〜1440 |
| `cycle_days` | 1（日次）または7（週次） |
| `effective_from` | inclusive local date |
| `effective_to` | inclusive、optional |

同じDogのgoal期間は重複しません。distanceはgoal primitiveではありません。
