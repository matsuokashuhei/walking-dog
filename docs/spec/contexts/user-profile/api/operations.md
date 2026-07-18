# User Profile API Operations

```graphql
myProfile: UserProfile!
myPreferences: UserPreferences!
updateMyProfile(input: UpdateMyProfileInput!): UserProfile!
updateMyPreferences(input: UpdateMyPreferencesInput!): UserPreferences!
```

mutation inputは`requestId`と`expectedVersion`を持ちます。

## Events

- `UserProfileUpdated.v1`: UserId、displayName、avatarAssetId、revision、occurredAt
- `UserPreferencesUpdated.v1`: UserId、locale、unitSystem、appearance、notificationsEnabled、revision、occurredAt

