# Use Case: Complete Upload

`MED-021`: Userはupload済みobjectを検証・normalizeし、ready Assetへ確定できます。

1. Asset owner、pending state、request IDを検証します。
2. storage HEADとdeclared bytes/checksumを比較します。
3. file signatureをdecodeしてcontent type spoofingを拒否します。
4. animationを静止画へ変換し、orientationを適用し、EXIFを除去します。
5. purpose別max dimension内へ縮小し、JPEGまたはPNGとして保存します。
6. normalized metadataを保存し、`MediaReady v1`をOutboxへ追加します。

source objectはnormalization完了後に削除します。失敗時は`rejected`へ進め、consumerへURLを返しません。

