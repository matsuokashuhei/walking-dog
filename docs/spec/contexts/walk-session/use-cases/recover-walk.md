# Recover Walk

アプリ起動、ログイン復旧、foreground復帰時に`currentWalk`を問い合わせます。

- serverに進行中Walkがなければ、孤立したローカルキューを送信せず破棄候補として提示します。
- `starting`なら同じWalkIdでTrack初期化を再開します。
- `active`なら最後に確認済みのTrack sequenceから送信を再開します。
- `finishing`ならTrack確定または終了情報入力の未完了段階へ戻ります。

別端末から復旧しても新しいWalkを作りません。端末内の未送信イベントはrequestIdによって重複を防ぎます。
