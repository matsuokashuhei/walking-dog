# Media Domain Model

## Media Asset

| Field | Type | Rule |
| --- | --- | --- |
| `media_asset_id` | UUID | opaque stable ID |
| `owner_user_id` | UUID | Identity-issued ID、foreign keyなし |
| `purpose` | enum | `user_avatar`、`dog_avatar`、`walk_photo` |
| `status` | enum | `pending_upload`、`processing`、`ready`、`rejected`、`deleted` |
| `content_type` | enum | normalized `image/jpeg`または`image/png` |
| `byte_size` | integer | normalized object size |
| `sha256` | 64 lowercase hex | normalized object checksum |
| `pixel_width` / `pixel_height` | integer | 1以上 |
| `version` | integer | lifecycle updateごとに増加 |

DogId、WalkId、profile IDはMedia Assetへ保存しません。意味的関連はconsumer contextがMediaAssetIdとして所有します。

## Upload Grant

Upload GrantはMediaAssetId、single-use upload URL、required headers、maximum bytes、expiresAtを持ちます。有効期限は15分です。URLとobject keyは公開eventへ含めません。

## Invariants

- `MED-010`: ready Assetだけがconsumerへ関連付け可能です。
- `MED-011`: Asset ownerと認証Userが一致しなければmutationできません。
- `MED-012`: 同じMediaAssetIdのpurposeとownerは変更できません。
- `MED-013`: rejected/deleted Assetはreadyへ戻りません。
- `MED-014`: normalized objectからEXIF、embedded profile、unexpected metadataを除去します。
