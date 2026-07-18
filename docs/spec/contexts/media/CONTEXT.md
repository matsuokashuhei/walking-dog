# Media

## Purpose

User、犬、散歩に使う画像を安全に受け取り、検証し、配信します。

## Product Axes

- 犬の体験: 犬と散歩の記憶を画像で豊かにします。
- データによる散歩の最大化: 写真を時刻・所有者と結び付けられるassetにします。
- 飼い主の貢献心: ケアの記録を視覚的に残します。

## Owns

upload、validation、asset ownership、object persistence、delivery、deletion。

## Does Not Own

profile/dog/walkとの意味的関連、walk event ordering。

## Published Contracts

Media Catalog v1とmedia lifecycle events。

## Consumed Contracts

Identity Directory v1。

## Allowed Dependencies

自context、generated contracts、object storage adapter、platform。

## Reading Scope

このcontextとIdentityの公開contractだけを読みます。
