# Walk Session API Operations

```graphql
currentWalk: Walk
walk(id: UUID!): Walk
startWalk(input: StartWalkInput!): Walk!
recordWalkEvent(input: RecordWalkEventInput!): WalkEvent!
attachWalkPhoto(input: AttachWalkPhotoInput!): WalkPhoto!
requestWalkFinish(input: RequestWalkFinishInput!): Walk!
completeWalk(input: CompleteWalkInput!): Walk!
abandonWalk(input: AbandonWalkInput!): Walk!
```

すべてのmutationは`requestId`を持ち、状態変更には`expectedVersion`を持ちます。

## Service Contracts

- Track向け`walkRecordingAuthorization(walkId, userId)`はactive/finishingの可否と開始時刻を返します。
- History向けの正本は`WalkStarted v1`、`WalkEventRecorded v1`、`WalkFinished v1`です。
- `WalkFinished v1`はparticipants snapshot、開始・終了時刻、distanceMeters、durationSeconds、completion metadata、photo AssetIdsを含みます。
