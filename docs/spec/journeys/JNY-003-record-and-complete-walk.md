# JNY-003 Record and Complete Walk

## Outcome

利用者が一頭以上の犬を選び、通信断やアプリ中断に耐えて散歩・ケアイベント・写真・経路を記録し、確定summaryとして保存できます。

## Context Sequence

1. Walk SessionがDog Directoryで全participantの散歩権限とsnapshotを確認する。
2. WalkIdを作り、Track Recordingを初期化してactiveにする。
3. mobileはGPS batchをTrackへ、pee/poopをWalkへ送る。
4. 写真はMediaでupload/validation後、ready AssetIdをWalkへ関連付ける。
5. 終了要求時、WalkがTrackへfinalizeを依頼する。
6. Trackが距離summaryを確定し、Walkが終了サマリーを表示する。
7. 利用者が任意metadataを保存またはスキップし、WalkFinishedを公開する。
8. Historyが完了実績を投影する。

## Hard Boundaries

WalkはGPS pointを保存・算出せず、Trackは犬の権限やWalkの意味を所有しません。Mediaは写真がどのWalkに属するかを所有しません。Historyは完了前のWalkを実績へ入れません。

## Failure and Recovery

- start retryは同じWalkIdへ収束する。
- offline point/eventはrequestIdとsequenceを保って再送する。
- GPS品質不足は距離0へ隠さずaccepted/rejected件数を示す。
- Track finalize失敗時はcompletedにせず記録へ戻れる。
- app再起動時はserverのcurrentWalkを正本に中断段階へ復帰する。

## Acceptance

一利用者に進行中Walkは一件、participantは一頭以上、WalkFinishedは一度だけです。完了後の一覧・詳細・犬別・利用者集計は同じ距離と時間へ収束します。
