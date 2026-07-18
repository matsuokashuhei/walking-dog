# JNY-004 Review History and Insights

## Outcome

利用者が全体または犬別の散歩履歴を辿り、経路、ケアイベント、写真、距離、時間、週次傾向、目標進捗を一貫して理解できます。

## Context Sequence

1. Historyが完了eventから最新順一覧を返す。
2. 詳細はHistory snapshotを軸に、Track routeとMedia delivery URLを契約経由でcompositionする。
3. User Profile画面はHistoryの生涯・週次queryを表示する。
4. Dog detailはHistoryの犬別統計・目標・直近履歴を表示する。
5. 距離表示はUser Profileのunit preference、日付境界はlocale/timezoneへ従う。

## Failure and Recovery

初回loadingを空状態にせず、全体error、not found、projection incomplete、route/mediaの部分障害を区別します。pagination失敗時は既存pageを保持します。projectionが遅延・欠損している場合はfreshnessを示し、誤った0値を出しません。

## Acceptance

- 同じWalkの一覧・詳細・集計metricsが一致する。
- cursor pagingで欠落・重複がない。
- 同名犬でもDogId filterが正しい。
- routeが使えなくてもmetricsとtimelineを閲覧できる。
- graphとmapを使えない利用者にもtextで同じ意味を伝える。
