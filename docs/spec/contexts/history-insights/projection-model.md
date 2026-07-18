# History Projection Model

## Consumed Events

- Identity: `UserRegistered v1`、`UserDisabled v1`
- User Profile: `UserProfileUpdated v1`、`UserPreferencesUpdated v1`
- Dog: `DogRegistered v1`、`DogUpdated v1`、`DogRemoved v1`、`DogWalkGoalChanged v1`
- Walk: `WalkStarted v1`、`WalkEventRecorded v1`、`WalkFinished v1`
- Track: `TrackDistanceFinalized v1`
- Media: `MediaReady v1`、`MediaDeleted v1`

WalkFinishedを完了履歴の作成triggerとし、同eventに含まれる確定距離・時間・participants・completionを正本snapshotとして使います。Track eventは整合性照合に使い、WalkFinishedと値が異なる場合はprojectionを`incomplete`として警告を記録します。

## Delivery Semantics

eventはat-least-once deliveryを前提とします。`eventId`でdeduplicateし、aggregate revisionの飛びを検出します。未知のevent versionは無視せずconsumerを停止して運用アラートを出します。
