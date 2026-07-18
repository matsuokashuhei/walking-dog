# Contract Compatibility Policy

- optional field追加は同じmajor versionで許可する。
- required field追加、field削除、型変更、意味変更は新major versionを必要とする。
- providerは旧major versionのconsumer移行期間を一つ提供する。
- consumer固有のschema copyを禁止する。
- event consumerは重複、遅延、再送を安全に処理する。
- providerと登録consumerは同じcontract fixtureで検証する。
- deprecated contractは利用consumerが0になってから削除する。
