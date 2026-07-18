# Walk Session Local State

端末は`walkId`、server status、最後に確認済みのTrack sequence、未送信Track batch、未送信care event、各requestIdを暗号化された永続領域へ保存します。

サーバーがlifecycleの正本です。端末は完了状態を単独で確定しません。送信成功のackを受けた項目だけをキューから除きます。ログアウト時も進行中Walkのデータを黙って削除せず、再認証後に同じUserIdで復旧します。
