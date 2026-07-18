# Track Recording Product Purpose

Track Recordingは、散歩中の位置情報を通信断に耐えて順序どおり保存し、説明可能な規則で経路と距離を確定します。

## Success

- 同じpointの再送で重複せず、異なるpayloadの衝突を検出する。
- 低精度、時刻外、異常速度のpointを消さずに理由付きで除外する。
- 暫定表示と最終確定で同じ距離規則を使用する。
- Walk SessionはDynamoDBや距離algorithmを知らず、契約だけでfinal summaryを得る。

経路推薦、地図tile、geofence、他利用者とのライブ共有は初期scopeに含みません。
