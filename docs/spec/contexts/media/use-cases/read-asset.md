# Use Case: Read Asset

`MED-022`: authorized consumerはready Assetの短時間delivery URLを取得できます。

Mediaはowner Userまたはservice callerを認証します。consumerはDog/Walk/Profileの閲覧認可を先に行い、Media CatalogへMediaAssetIdとviewer UserIdを渡します。

delivery URLは5分で失効し、cache keyへtokenを含めません。deleted/rejected/pending Assetは`ASSET_NOT_READY`です。object missingは0-byte fallbackにせず`STORAGE_INCONSISTENT`として隔離します。

