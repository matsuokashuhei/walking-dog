# Replaceability

contextは次を満たすとき単独で再構築可能です。

- provider-owned contractsの互換性を維持する。
- owned dataをexport/importまたはevent replayで再構築できる。
- consumer contract testsが内部実装なしで通る。
- context専用fixtureだけでdomain/API/data acceptanceを検証できる。
- correlation IDから境界内の失敗を診断できる。

置き換え時にconsumerへdatabase migrationや内部型変更を要求した場合、境界違反です。
