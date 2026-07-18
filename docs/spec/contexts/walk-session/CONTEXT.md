# Walk Session

## Purpose

選択した犬との散歩を安全に開始、記録、完了、復旧します。

## Product Axes

- 犬の体験: 一頭またはpackとの実際の外出を記録します。
- データによる散歩の最大化: lifecycleとeventsを欠損なく残します。
- 飼い主の貢献心: 完了した散歩をケアの成果にします。

## Owns

walk lifecycle、participants、pee/poop events、completion metadata、media references。

## Does Not Own

GPS persistence、distance algorithm、history projections、media objects。

## Published Contracts

Walk Commands v1とwalk lifecycle events。

## Consumed Contracts

Identity Directory v1、Dog Directory v1、Media Catalog v1、Track Recorder v1。

## Allowed Dependencies

自context、generated contracts、platform。

## Reading Scope

このcontextと直接利用する4契約だけを読みます。

