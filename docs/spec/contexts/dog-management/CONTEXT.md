# Dog Management

## Purpose

Userと一緒に暮らす犬、その関係、時間ベースの散歩目標を管理します。

## Product Axes

- 犬の体験: 犬ごとの個性と関係を記録します。
- データによる散歩の最大化: 犬別目標と履歴の基準を提供します。
- 飼い主の貢献心: ケア対象と目標を明確にします。

## Owns

dogs、user-dog roles、dog profile、walk goals。

## Does Not Own

authentication、walk lifecycle、track points、history projections。

## Published Contracts

Dog Directory v1とdog/goal lifecycle events。

## Consumed Contracts

Identity Directory v1、Media Catalog v1。

## Allowed Dependencies

自context、generated contracts、platform。

## Reading Scope

このcontextとIdentity/Mediaの公開contractだけを読みます。

