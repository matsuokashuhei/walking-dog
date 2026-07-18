# JNY-004 Recover Active Walk

Requirement links: IDA-010..019、WKS-010..029、TRK-001..012。

## Purpose and Preconditions

通信断、process終了、端末再起動、session期限切れの後も、進行中の散歩を新規作成せず同じWalkIdで復旧します。serverに`starting`、`active`、`finishing`のいずれかがあり得ます。

## Recovery Flow and Boundaries

1. App Shellがsessionをrefreshし、失敗時はIdentityの再認証へ進む。
2. 認証後、Walk Sessionの`currentWalk`をserver正本として取得する。
3. `starting`ならWalkが同じWalkIdでTrack initializeを再試行する。
4. `active`ならmobileの最後に確認済みsequenceとTrack statusを照合し、未ack batchとcare eventだけを再送する。
5. `finishing`ならTrack finalizeまたはcompletion metadata入力の未完了段階へ戻る。
6. 回復後はJNY-002またはJNY-003の終了flowへ合流する。

## Partial Failure

Identity refresh responseに必要tokenが欠けた場合は保護dataを消さず再認証します。Walkが既にcompletedならlocal queueを送信せず履歴へ遷移します。serverに進行中Walkがない孤立queueは自動的に別Walkへ転用しません。

## Events and Idempotency

復旧そのものでは二つ目のWalkStartedを発行しません。同じpoint sequence、care event requestId、finish operationは同じ結果へ収束し、異なるpayloadのkey再利用は衝突として止めます。

## Final Data State

復旧前後でWalkId、UserId、participant snapshotは不変です。ack済みdataは重複せず、未ack dataは保存または明示的なrejectionとして説明されます。

## Acceptance

別端末または再起動後でも進行中Walkは最大一件で、完了した場合の距離・event件数は中断なしの場合と同じ規則で算出されます。
