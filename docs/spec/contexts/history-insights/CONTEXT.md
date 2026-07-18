# History & Insights

## Purpose

完了した散歩をUserと犬が理解できる履歴・集計へ変換します。

## Product Axes

- 犬の体験: 犬ごとの活動と関係の履歴を示します。
- データによる散歩の最大化: route、events、distance、time、goal progressを説明します。
- 飼い主の貢献心: 積み重ねを見える成果として返します。

## Owns

walk history views、dog/user totals、weekly metrics、goal progress projections。

## Does Not Own

source record mutation、walk lifecycle、GPS ingestion。

## Published Contracts

History Queries v1。

## Consumed Contracts

User、Dog、Walk、Track、Mediaの公開events。

## Allowed Dependencies

自context、generated event schemas、platform。

## Reading Scope

このcontextとsource eventsだけを読みます。
