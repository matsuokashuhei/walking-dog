# JNY-005 Review Walk History

Requirement links: USR-022..035、DOG-021..037、HIS-001..038、TRK-013、MED-003。

## Purpose and Preconditions

認証済み利用者が完了した散歩を全体または犬別に辿り、経路、ケアイベント、写真、距離、時間、週次傾向、目標進捗を一貫して理解します。少なくともprojection queryが利用可能です。

## Normal Flow and Boundaries

1. Historyが完了Walkを`completedAt DESC, walkId DESC`でpage返却する。
2. Dog detailからはDogId filter、Me profileからはUser集計をqueryする。
3. 行選択時、HistoryがWalk snapshot、metrics、timelineを返す。
4. routeはTrackへ、写真URLはMediaへend-user identity付き契約で問い合わせる。
5. unit、locale、timezoneはUser Profile preferenceを使ってfrontend表示へ変換する。

Historyはprovider DBやraw GPSを読みません。Profile/Dog frontendはHistory内部componentをimportせずquery resultを自画面へcompositionします。

## Partial Failure and Recovery

初回loading、成功0件、error、not found、projection incompleteを分けます。次page失敗は既存行を保持し、route/photo失敗は詳細の該当sectionだけ再試行します。projection gapは0値へ置換しません。

## Events and Freshness

WalkFinishedを履歴作成のtriggerとし、TrackDistanceFinalizedとの距離整合を検証します。応答はprojectedThroughと`current`、`lagging`、`incomplete`の状態を持ちます。

## Final Data State

このjourneyはread-onlyでsource stateを変更しません。refreshやpagingによって新しいprojectionを読み、署名付きMedia URLやraw routeをHistory DBへ永続化しません。

## Acceptance

同じWalkの一覧・詳細・User/Dog集計が一致し、cursor pageに欠落・重複がなく、map/graphを利用できなくてもtextで同じ情報を理解できます。
