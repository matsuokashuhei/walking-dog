# Media Idempotency

- request ID resultは24時間保持します。
- Request Upload再送は同じgrantを返します。有効期限後は同じAssetをdeletedにし、新request IDを要求します。
- Complete再送は現在Asset stateを返し、再normalizeしません。
- Delete再送はobjectが既にない場合も成功です。
- MediaReady/MediaDeleted eventはAsset revisionごとに一つです。

