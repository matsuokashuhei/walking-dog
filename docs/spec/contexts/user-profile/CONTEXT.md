# User Profile

## Purpose

Userが自分の表示情報と体験設定を管理できるようにします。

## Product Axes

- 犬の体験: 犬と歩く人を分かりやすくします。
- データによる散歩の最大化: localeとunitsで記録を正しく解釈します。
- 飼い主の貢献心: 自分の活動を自分のprofileとして認識できます。

## Owns

display name、profile avatar reference、locale、units、appearance、notifications。

## Does Not Own

credentials、email verification、media bytes、history aggregates。

## Published Contracts

User Profile Queries v1とprofile/preference events。

## Consumed Contracts

Identity Directory v1、Media Catalog v1。

## Allowed Dependencies

自context、generated contracts、platform。

## Reading Scope

このcontextとIdentity/Mediaの公開contractだけを読みます。

