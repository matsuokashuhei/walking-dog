# Contract Registry

契約はprovider contextだけが所有します。consumerはcanonical artifactから生成されたclient/typeを利用します。

| Provider | Synchronous contract | Published events | Primary consumers |
| --- | --- | --- | --- |
| Identity & Access | Identity Directory v1 | UserRegistered v1、UserEmailChanged v1、UserDisabled v1 | User Profile、Dog、Walk、Media |
| User Profile | User Profile Queries v1 | UserProfileUpdated v1、UserPreferencesUpdated v1 | History、App Shell |
| Dog Management | Dog Directory v1 | DogRegistered v1、DogUpdated v1、DogRemoved v1、DogWalkGoalChanged v1 | Walk、History |
| Walk Session | Walk Commands v1 | WalkStarted v1、WalkEventRecorded v1、WalkFinished v1 | Track、History |
| Track Recording | Track Recorder v1 | TrackDistanceFinalized v1 | Walk、History |
| History & Insights | History Queries v1 | none | Dog/Profile/History frontend |
| Media | Media Catalog v1 | MediaReady v1、MediaDeleted v1 | Profile、Dog、Walk、History |

