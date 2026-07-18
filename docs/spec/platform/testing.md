# PLT-005 Testing Strategy

## Context-local Tests

各contextはdomain invariant、state machine、API authorization/error/idempotency、schema constraint、repository access patternを自分のtest suiteで検証します。外部contextはversioned contract fixtureまたはprovider stubだけを使い、相手の内部DB fixtureへ依存しません。

## Contract Tests

providerは公開operation/eventのschema、意味、互換性を検証します。consumerは利用fieldとerror behaviorの期待を検証します。contract registryの各edgeにprovider/consumer testを一組以上持たせます。

## Journey Tests

`JNY-001`から`JNY-005`をcross-context end-to-endの最小集合とします。正常系だけでなくOTP期限切れ、offline recovery、Track finalize失敗、projection lag、Media部分障害を含めます。

## Data Tests

- PostgreSQL DDLを空DBへ適用し、context間FKがないことを確認する。
- DynamoDB item schemaとaccess pattern fixtureを検証する。
- event replayでHistory projectionを二回構築し同じ結果になることを確認する。
- distance algorithmは固定座標fixtureで決定的に検証する。

この仕様作成ではapplication code、Harness、CI、Maestroを変更・実行対象にしません。実装段階では影響するjourneyの自動化を各feature計画へ含めます。
