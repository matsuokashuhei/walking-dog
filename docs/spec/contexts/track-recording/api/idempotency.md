# Track Recording Idempotency

- pointの一意性は`(walkId, sequence)`です。同じcanonical payloadなら既存ackを返し、異なるpayloadなら`TRACK_POINT_CONFLICT`です。
- batch requestIdの再送は保存済みのbatch結果を返します。
- initializeはWalkIdごとに一度で、同じ開始時刻の再送は同じ状態を返します。
- finalizeは`(walkId, summaryVersion)`で一意です。同じ終了時刻なら同じsummaryを返します。
- ackは全pointがdurableになった後だけ返します。部分失敗時は未保存を成功扱いしません。
