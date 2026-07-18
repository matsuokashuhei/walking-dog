# Finish Walk

1. 利用者が終了を要求するとWalkを`finishing`へ遷移させます。
2. Walk SessionはTrack Recorderへfinalizeを要求します。
3. Trackの確定距離と終了時刻から所要時間を確定します。
4. アプリは終了サマリーを表示し、利用者はメモ、気分、天気、タグを保存するかスキップします。
5. Walkを`completed`にして`WalkFinished v1`を一度だけ公開します。

Track確定が一時失敗した場合は`active`へ戻し、記録を継続可能にします。終了情報の保存を待つ`finishing`は復旧可能です。利用者が明示的にスキップした場合もcompletion metadataを空で確定します。
