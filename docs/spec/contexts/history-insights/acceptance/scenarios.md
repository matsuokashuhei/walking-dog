# History & Insights Acceptance Scenarios

## Consistent list and detail

Given 完了Walkがprojectionへ反映された
When 一覧行と詳細を取得する
Then WalkId、距離、時間、参加犬、pee/poop件数が一致する

## Dog filtering

Given 同名の犬二頭と複数犬Walkがある
When 一方のDogIdで一覧をfilterする
Then 対象DogIdを含むWalkだけが最新順で一度ずつ返る

## Cursor pagination

Given 21件以上の履歴がある
When 20件取得後にendCursorで次pageを取得する
Then 重複なく残りが返り、filterを変えたcursorは拒否される

## Weekly boundaries

Given timezone内で日曜深夜と月曜直後に完了したWalkがある
When 月曜開始の週次集計を取得する
Then それぞれ正しい週と日に分類され7日分が返る

## Projection lag

Given provider eventのrevisionに欠損がある
When insightsを取得する
Then 誤った0ではなくfreshness=incompleteと警告が返る

## Rebuild

Given active generationと同じsource event一式がある
When 新generationを再構築し検証する
Then件数・距離・時間の合計が一致した場合だけactiveへ切り替わる

## Partial route failure

Given detail projectionは正常でTrack queryだけが失敗する
When Walk detailを開く
Then metricsとtimelineは表示され、route sectionだけ再試行できる
