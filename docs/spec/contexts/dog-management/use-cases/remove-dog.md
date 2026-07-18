# Use Case: Remove Dog

`DOG-023`: owner roleのUserは確認後にDogをremovedへ変更できます。

removeはhard deleteではありません。新しいWalkへの参加、profile mutation、goal設定を拒否し、`DogRemoved v1`を発行します。過去WalkとHistoryはDog snapshotを保持します。

一人のownerがroleを外す操作とDog全体をremoveする操作は別です。初期UIは単独ownerだけを想定しDog removeを提供します。

