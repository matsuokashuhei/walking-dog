# Track Recording

## Purpose

散歩中の位置点を順序付きで保存し、品質を評価して距離を確定します。

## Product Axes

- 犬の体験: 実際に歩いたrouteを正確に残します。
- データによる散歩の最大化: GPS品質と距離計算の根拠を保存します。
- 飼い主の貢献心: 散歩の量を信頼できる形で示します。

## Owns

track ingestion、ordering、deduplication、quality filtering、distance finalization。

## Does Not Own

walk start/finish authorization、participants、history presentation。

## Published Contracts

Track Recorder v1とTrackDistanceFinalized v1。

## Consumed Contracts

WalkStarted v1とWalkFinished v1。

## Allowed Dependencies

自context、generated contracts、DynamoDB adapter、platform。

## Reading Scope

このcontextとWalk Sessionの公開eventだけを読みます。
