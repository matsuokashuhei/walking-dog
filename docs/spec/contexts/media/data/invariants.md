# Media Data Invariants

- object keyはenvironment内uniqueで推測不能です。
- normalized checksumはready Assetで必須です。
- ready Assetはnormalized objectを一つだけ持ちます。
- owner UserId、purpose、createdAtはimmutableです。
- MediaReady/MediaDeletedとstate mutationは同じtransactionのOutboxへ入ります。
- storage deleteはat-least-onceで安全です。
- raw EXIF、raw GPS、source filenameを永続metadataへ保存しません。

