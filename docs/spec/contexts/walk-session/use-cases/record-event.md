# Record Walk Event

activeな散歩に`pee`または`poop`を記録します。入力は`requestId`、WalkId、種別、端末での発生時刻、任意の緯度・経度です。

- 実行者がWalkのUserIdと一致する必要があります。
- 発生時刻は開始30秒前から現在5分後までです。
- 位置は緯度・経度が両方あるか、両方ないかのいずれかです。
- 記録成功時に`WalkEventRecorded v1`を公開します。
- 写真はMediaでreadyになったAssetIdを`attachWalkPhoto`で関連付けます。
