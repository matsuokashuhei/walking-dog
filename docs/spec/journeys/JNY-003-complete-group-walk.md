# JNY-003 Complete Group Walk

Requirement links: DOG-021..037、WKS-020..029、TRK-001..012、HIS-001..038。

## Purpose and Preconditions

利用者が権限を持つactiveな犬を二頭以上選び、一つの散歩・経路・timerとして記録し、各犬の履歴と目標へ同じ実績を反映します。

## Normal Flow and Boundaries

1. Walk Sessionが全DogIdを一回のDog Directory requestで検証し、順序付きsnapshotを得る。
2. 一つのWalkIdと一つのTrackを開始し、全participantを含む`WalkStarted v1`を公開する。
3. GPS、care event、写真を単一Walkへ記録する。care eventは初期仕様ではWalk全体に属し、特定犬へ割り当てません。
4. Trackを一度finalizeし、一つの距離summaryを得る。
5. Walkを一度completedにし、全participantを含む`WalkFinished v1`を公開する。
6. Historyは全体一覧に一件、各参加Dog filterに同じWalkIdを一件ずつ投影し、各犬の時間目標へ全durationを算入する。

## Events and Consistency

WalkStarted/WalkFinishedのparticipants snapshotは同じDogId集合です。Dogが途中で更新・removedになっても進行中Walkと過去表示のsnapshotは変えません。

## Partial Failure and Recovery

一頭でも開始時検証に失敗したらWalkを部分開始せず、対象犬を示して選択画面へ戻します。開始成功後は一頭だけを途中削除しません。Track/Historyの失敗は単独Walkと同じ回復規則です。

## Final Data State

一つのcompleted Walk、一つのTrack summary、二頭以上のimmutable participant、一つのHistory itemがあります。Dog別projectionでは全participantへ同一WalkId、distance、durationが反映されます。

## Acceptance

全体一覧に重複せず、各参加犬の一覧には現れ、非参加犬には現れません。複数犬だから距離や時間を頭数で割りません。
