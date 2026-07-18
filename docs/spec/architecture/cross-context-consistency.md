# Cross-Context Consistency

## Publication

state changeとevent publicationは同じlocal transactionでOutboxへ記録します。publisherはOutbox IDをevent IDとして使い、at-least-once deliveryを前提にします。

## Consumption

consumerはevent IDを保存して重複適用を防ぎます。同じaggregateのevent順序はaggregate IDとrevisionで検証し、欠番は再取得または隔離します。

## Synchronous Commands

user actionが即時結果を必要とするときだけ同期APIを使います。request IDを必須にし、同一requestの再送は同じ結果を返します。

## Partial Failure

失敗を成功に見せません。retryable、terminal、conflict、unavailableを区別し、retry budget超過はquarantineへ送ります。既に外部副作用がある場合は、所有contextが補償commandを定義します。

## Observability

request、command、eventはcorrelation IDとcausation IDを引き継ぎます。token、OTP、raw GPS、signed URL、email本文はlogへ記録しません。

