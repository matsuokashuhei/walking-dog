# Media API Operations

```graphql
requestMediaUpload(input: RequestMediaUploadInput!): MediaUploadGrant!
completeMediaUpload(input: CompleteMediaUploadInput!): MediaAsset!
deleteMediaAsset(input: DeleteMediaAssetInput!): DeleteMediaAssetResult!
mediaAsset(input: MediaAssetInput!): MediaAsset!
mediaDelivery(input: MediaDeliveryInput!): MediaDelivery!
```

mutation inputは`requestId: UUID!`を持ちます。MediaAssetはID、purpose、status、dimensions、versionだけを公開し、object keyとstorage bucketを公開しません。

## Events

- `MediaReady.v1`: event ID、MediaAssetId、owner UserId、purpose、dimensions、revision
- `MediaDeleted.v1`: event ID、MediaAssetId、owner UserId、purpose、revision

signed URL、object key、checksumはeventへ含めません。
