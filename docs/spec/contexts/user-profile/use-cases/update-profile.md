# Use Case: Update Profile

`USR-021`: Userはdisplay nameとavatar referenceを更新できます。

1. inputをnormalizeし、expected versionを検証します。
2. avatar変更時はMedia Catalogでowner、purpose、ready statusを確認します。
3. Profileを更新してversionを増やします。
4. `UserProfileUpdated v1`を同じtransactionのOutboxへ追加します。

変更がないinputは成功として現在Profileを返し、eventを発行しません。Avatar削除は`avatarAssetId: null`で表現し、Media Asset自体の削除は別commandです。

