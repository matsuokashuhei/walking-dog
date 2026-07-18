# Track Recording Acceptance Scenarios

## Durable retry

Given 端末が同じbatchをack消失後に再送する
When WalkId、sequence、payloadが一致する
Then pointは重複せず同じackが返る

## Detect conflicting sequence

Given sequence 10が保存済み
When 異なる座標をsequence 10として送る
Then TRACK_POINT_CONFLICTとなり既存pointは上書きされない

## Explain rejected point

Given 直前pointから20m/s相当で飛ぶpointが届く
When batchを受理する
Then pointは保存され、acceptedForDistance=falseと速度超過理由が返る

## Finalize deterministically

Given accepted point列が保存されている
When 同じ終了時刻でfinalizeを二回要求する
Then Haversine規則による同一version・同一距離のsummaryが返る

## No usable points

Given accepted pointが一件以下である
When Trackをfinalizeする
Then distanceMeters=0で、accepted/rejected件数により測位品質を判別できる
