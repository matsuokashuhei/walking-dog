# Use Case: Delete Asset

`MED-023`: owner Userまたは所有consumerの補償commandはAssetをidempotentに削除できます。

1. ownerまたはservice authorizationを確認します。
2. statusを`deleted`へ進め、`MediaDeleted v1`をOutboxへ追加します。
3. deliveryを即時拒否します。
4. object deleteを非同期で再試行します。

object delete失敗でもAssetをreadyへ戻しません。consumerはMediaDeleted受信後に関連を外すかplaceholderを表示します。

