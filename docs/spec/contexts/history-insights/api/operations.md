# History & Insights API Operations

```graphql
myWalks(first: Int!, after: String, dogId: UUID): WalkHistoryConnection!
myWalkDetail(walkId: UUID!): WalkDetail!
myLifetimeStats: UserLifetimeStats!
myWeeklyStats(timeZone: String!, weekContaining: Date!): UserWeeklyStats!
myDogInsights(dogId: UUID!, timeZone: String!): DogInsights!
```

すべての応答は`freshness { status, projectedThrough, warnings }`を含みます。statusは`current`、`lagging`、`incomplete`です。

`myWalks`のpageInfoは`endCursor`と`hasNextPage`を返します。clientが任意offsetやDB keyをcursorとして組み立てることはできません。
