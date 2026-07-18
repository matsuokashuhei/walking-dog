# Dog Management API Operations

```graphql
myDogs: [Dog!]!
dog(id: UUID!): Dog!
dogWalkGoals(dogId: UUID!): [DogWalkGoal!]!
registerDog(input: RegisterDogInput!): Dog!
updateDog(input: UpdateDogInput!): Dog!
removeDog(input: RemoveDogInput!): RemoveDogResult!
setDogWalkGoal(input: SetDogWalkGoalInput!): DogWalkGoal!
```

mutationは`requestId`、update/removeは`expectedVersion`を持ちます。

## Directory Contract

`walkEligibleDogs(userId, dogIds)`は各DogIdのactive statusとUser roleをservice callerへ返します。

## Events

DogRegistered、DogUpdated、DogRemoved、DogWalkGoalChangedのv1 eventはDog snapshotまたはgoal snapshot、revision、occurredAtを含みます。

