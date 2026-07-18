# PLT-003 Observability

## Correlation

end-user requestは`requestId`、cross-context callは`correlationId`と`causationId`、eventは`eventId`とaggregate revisionを持ちます。値はcontext境界を越えて伝播しますが、tokenやpayload全体は伝播しません。

## Required Signals

| Area | Metrics |
| --- | --- |
| Identity | OTP request/verify success、rate limit、refresh rotation failure |
| Walk | start/finish latency、active recovery、finalization failure、duplicate prevention |
| Track | batch latency、accepted/rejected points by reason、sequence conflict、distance finalize latency |
| Media | upload completion、validation rejection、orphan cleanup |
| History | consumer lag、revision gap、projection freshness、rebuild verification |
| Contracts | error rate/latency by provider, consumer, version |

## Alerts

認証成功率急落、WalkFinished欠損、Track finalize滞留、outbox滞留、History gap、Media processing滞留、契約version不一致をalert対象とします。0件が正常な期間を単純な障害扱いせず、比率・遅延・滞留時間を用います。

logはstructuredで、context、operation、safe error code、request/correlation IDを含めます。個人情報と正確な位置はredactします。
