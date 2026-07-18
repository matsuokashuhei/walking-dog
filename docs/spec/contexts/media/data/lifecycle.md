# Media Data Lifecycle

- pending source: grant期限後24時間以内に削除
- rejected source: diagnostic codeだけを30日保持しbytesを削除
- ready normalized object: consumer referenceがある期間保持
- deleted Asset: deliveryを即時停止し、objectを30日以内に物理削除
- Outbox event: publication確認後90日でarchive可能

consumer reference countをMedia内部で推測しません。semantic owner contextがDelete commandを送るまでready Assetを保持します。
