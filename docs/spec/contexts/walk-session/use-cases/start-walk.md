# Start Walk

1. 利用者は一頭以上のDogIdを選び、`requestId`を付けて開始します。
2. Walk SessionはIdentity Directoryで利用者がactiveであることを確認します。
3. Dog Directoryで全犬がactiveかつ利用者に散歩権限があることを確認し、snapshotを取得します。
4. 同じ利用者に進行中の散歩がないことを保証して`starting`を保存します。
5. Track RecorderへWalkIdと開始時刻を渡して初期化します。
6. 初期化成功後に`active`とし、`WalkStarted v1`を公開します。

同じ`requestId`の再送は同じWalkを返します。別requestで進行中散歩がある場合は`WALK_ALREADY_IN_PROGRESS`です。
