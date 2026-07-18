# JNY-002 Manage Dogs and Goals

## Outcome

利用者が犬を登録・編集し、日次または週次の散歩時間目標を設定し、その犬との過去の積み重ねを確認できます。

## Context Sequence

1. Dog Managementが利用者の犬一覧を返す。
2. avatar選択時、Mediaがdog_avatar Assetをreadyにする。
3. Dog ManagementがAssetIdを参照して犬を登録・更新する。
4. Dog Managementが時間目標と有効期間を保存しeventを公開する。
5. HistoryがDog/goal/Walk eventsを投影し、統計・進捗・直近5件を返す。
6. 「すべて見る」はDogId filter付きのHistory一覧へ遷移する。

## Boundary Contracts

Media Catalog v1、Dog Directory v1、DogWalkGoalChanged v1、History Queries v1を使います。Dog ManagementはMedia objectやHistory projectionへ接続しません。

## Failure and Recovery

avatar upload失敗時は犬の入力値を保持して再試行できます。History障害を犬が0件・進捗0%として扱いません。犬をremovedにしても過去Walkのparticipant snapshotは保持します。

## Acceptance

- 犬0件では明示的な登録導線を表示する。
- 同名犬をDogIdで区別する。
- 目標期間を重複させない。
- 犬詳細の統計と履歴詳細のmetricsが一致する。
