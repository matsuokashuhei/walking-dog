# Use Case: Request Upload

`MED-020`: authenticated Userはpurposeとsource metadataを指定してsingle-use upload grantを取得できます。

1. purpose、declared content type、declared bytes、request IDを検証します。
2. MediaAssetIdとowner/purpose固定のpending rowを作ります。
3. environment、UserId、MediaAssetIdから推測不能なobject keyを生成します。
4. size、content type、checksum headerを制約した15分のupload URLを返します。

同じrequest IDの再送は同じMediaAssetIdを返します。別payloadでは`IDEMPOTENCY_CONFLICT`です。

