# PLT-004 Deployment and Isolation

## Initial Shape

初期段階では単一repositoryと共有deployment pipelineを許容します。ただしbuild target、runtime module、configuration、database principal、schema/table/bucket prefix、queue、契約artifactはcontext単位に分離します。

同一processへ配置する場合も、内部module importを公開契約で代用して境界を省略してはいけません。contextの置換時に他contextのmigrationや再compileを必須にしない形を目標にします。

## Environments

development、test、staging、productionを分離します。resource名は`walking-dog-{environment}-{context-or-resource}`です。production identifierやcredentialをspec、sample env、logへ記載しません。

## Release

- provider contractは後方互換versionを先にdeployする。
- consumer移行と観測後に旧versionを廃止する。
- database migrationはexpand/migrate/contract順で行う。
- event consumerは再送・順序逆転・旧versionへ耐える。
- feature単位でrollbackでき、他contextのdata rollbackを要求しない。

将来、組織・負荷・可用性の必要性が生じたcontextだけを独立service/deploymentへ切り出します。分割自体を目的にしません。
