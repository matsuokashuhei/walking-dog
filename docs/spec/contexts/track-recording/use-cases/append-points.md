# Append Track Points

端末はWalkId、連続する最大100件のpoint、batch requestIdを送信します。Track RecordingはWalk Recording Authorizationで実行者とWalk状態を確認し、各pointを永続化してからackします。

## Distance Acceptance

pointは保存したうえで、次を満たす場合だけ距離へ算入します。

- 緯度・経度が有効範囲内。
- `horizontalAccuracyMeters <= 100`。
- Walk開始30秒前より後で、確定済みなら終了30秒後より前。
- 直前のaccepted pointと同一座標・同一時刻ではない。
- 直前のaccepted pointとの時間差が正で、Haversine距離から算出した速度が15m/s以下。

順序逆転、重複、精度不足、時刻範囲外、速度超過はrejection reasonを残します。sequence欠番は許容しますが、欠番を自動補完しません。
