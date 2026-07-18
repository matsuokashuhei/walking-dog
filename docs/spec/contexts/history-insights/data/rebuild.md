# Projection Rebuild and Verification

## Build

1. `building` generationを作る。
2. providerごとのeventをcheckpointから順番にconsumeする。
3. aggregate revisionの連続性とpayload hashを検証する。
4. source streamのwatermarkまで到達後、追随modeへ移る。

## Verify

- provider別event件数とdeduplication件数
- WalkFinished件数とwalk_history件数
- history item合計とUser/Dog集計query結果
- Track summaryとWalkFinishedの距離一致
- 未知event version、revision gap、負値が0件

全検証成功時だけ`ready`から`active`へ切り替えます。旧generationはrollback期間後に`retired`にします。
