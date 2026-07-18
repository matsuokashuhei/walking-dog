# Track Recording API Operations

```graphql
trackStatus(walkId: UUID!): TrackStatus!
trackRoute(walkId: UUID!, first: Int!, after: String): TrackPointConnection!
initializeTrack(input: InitializeTrackInput!): TrackStatus!
appendTrackPoints(input: AppendTrackPointsInput!): AppendTrackPointsResult!
finalizeTrack(input: FinalizeTrackInput!): TrackSummary!
```

`initializeTrack`と`finalizeTrack`はWalk Session service専用です。mobile clientが利用できるのは`appendTrackPoints`、`trackStatus`、`trackRoute`です。

## Published Event

`TrackDistanceFinalized v1`はWalkId、summaryVersion、distanceMeters、acceptedPointCount、rejectedPointCount、firstRecordedAt、lastRecordedAt、finalizedAtを含みます。
