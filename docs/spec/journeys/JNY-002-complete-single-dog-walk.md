# JNY-002 Complete Single-dog Walk

Requirement links: DOG-021..037、WKS-001..019、TRK-001..012、MED-002、HIS-001..038。

## Purpose and Preconditions

利用者が権限を持つactiveな犬一頭との散歩を開始し、経路とケアイベントを記録し、確定実績として保存します。認証済みで進行中Walkがなく、位置権限の状態を確認済みです。

## Normal Flow and Boundaries

1. Walk SessionがDog Directoryから対象犬の権限とsnapshotを取得する。
2. WalkIdを作り、Track Recorderを初期化して`WalkStarted v1`を公開する。
3. mobileがGPS batchをTrackへ、pee/poopをWalkへ送る。
4. 写真はMediaがvalidationし、ready AssetIdをWalkが関連付ける。
5. 終了要求を受けたWalkがTrackへfinalizeを依頼する。
6. Trackが`TrackDistanceFinalized v1`とsummaryを返す。
7. Walkが確定summaryを表示し、任意metadataの保存またはskip後に`WalkFinished v1`を公開する。
8. Historyがeventを投影し、一覧・詳細・User/Dog集計を更新する。

Walkはraw GPS、Trackは犬の権限、Historyはsource mutation、MediaはWalkとの意味的関連を所有しません。

## Partial Failure and Recovery

offline送信はsequence/requestIdを保って再送します。Media失敗はGPS・care event記録を止めません。Track finalize失敗時はcompletedにせずactiveへ戻して再試行します。History遅延時はfreshnessを表示します。

## Final Data State

Walkにcompleted lifecycle、participant snapshot、events、任意のAssetId、completionがあります。Trackにimmutable summaryとpoint判定があります。Historyに一件のread modelがあり、全metricsがWalkFinishedと一致します。

## Acceptance

WalkFinishedは一度だけで、距離・時間・犬・event件数が一覧、詳細、犬別、利用者集計で一致します。
