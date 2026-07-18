# Dog State Machines

## Dog Lifecycle

```text
registering -> active -> removed
registering -> failed
```

removed Dogは再active化しません。誤削除の復元は新しい明示的product decisionを必要とします。

## Goal Lifecycle

新goalの`effective_from`で現在goalを前日終了にし、新rowを追加します。過去goalをin-place更新しません。未来goalの差し替えは同じtransactionで旧未来rowを終了または削除し、重複期間を作りません。
