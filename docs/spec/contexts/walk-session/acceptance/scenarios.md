# Walk Session Acceptance Scenarios

## Start and complete

Given 利用者が散歩可能な犬を選択している
When 散歩を開始し、Trackが初期化される
Then active Walkが一件作られ、完了時に確定距離を持つWalkFinishedが一度公開される

## Prevent duplicate active walks

Given 利用者にactive Walkがある
When 別requestIdで新しい散歩を開始する
Then WALK_ALREADY_IN_PROGRESSとなり既存Walkへの復帰先が得られる

## Offline recovery

Given active Walk中に通信が切れ端末へpointとcare eventが蓄積された
When 同じ利用者が再認証しcurrentWalkへ復帰する
Then requestIdとsequenceを保ったまま未送信分だけが再送される

## Finalization failure

Given 利用者が終了を要求した
When Track確定が一時失敗する
Then Walkはcompletedにならず、失敗を表示してactiveから再試行できる

## Skip optional summary

Given Trackが確定し終了サマリーが表示された
When 利用者が感想入力をスキップする
Then metadata_skipped=trueでWalkがcompletedになる
