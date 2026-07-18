# Media Data Ownership

PostgreSQL `media` schemaはAsset lifecycleとobject metadataを所有します。S3-compatible storageはsourceとnormalized image bytesを所有します。

consumerはMediaAssetIdだけを保存します。object key、bucket、CDN pathを保存しません。MediaはDogId、WalkId、profile IDを保存しません。
