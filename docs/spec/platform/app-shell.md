# PLT-001 App Shell

App Shellはfeatureを接続する薄いcomposition layerです。

## Owns

- 未認証／認証済みroute treeの切替
- Dogs、Walk、Meのtab registration
- deep linkの構文検証と対象featureへのdispatch
- 認証状態、locale、appearance、network状態の配布
- feature境界ごとのerror boundaryと起動telemetry

## Must Not Own

domain entity、GraphQL operation、feature screen、validation、walk lifecycle、集計、永続feature stateを持ちません。feature間で画面componentやstoreを直接importさせず、typed navigation parametersと公開frontend contractだけを使います。

active Walk中の保護はWalk Sessionが判断し、Shellは返されたnavigation intentを適用します。
