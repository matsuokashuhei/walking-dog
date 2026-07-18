# Finalize Distance

1. Walk SessionがWalkId、終了時刻、idempotency keyを指定してfinalizeします。
2. Trackを`finalizing`にし、終了時刻までのpoint判定を確定します。
3. sequence昇順のaccepted point間をHaversine式で結び、各segmentのmeterを合計します。
4. 最終結果を四捨五入して0以上の整数meterとし、version 1のsummaryを保存します。
5. Trackを`finalized`にして`TrackDistanceFinalized v1`を公開し、同じsummaryを返します。

pointが2件未満なら距離0です。距離0をGPS障害の代替成功として扱わず、accepted/rejected件数を必ず返します。
