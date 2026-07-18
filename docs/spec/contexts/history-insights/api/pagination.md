# History Pagination

cursor payloadはquery version、UserId、DogId filter、`completedAt`、WalkIdを含み、serverが署名します。有効期限は24時間です。

次pageはcursorより古い`(completedAt, walkId)`をkeyset paginationで取得します。refreshはcursorなしで開始し、旧pageと混在させません。同じWalkIdが複数pageに現れた場合はclientで隠すだけでなくprojection重複としてtelemetryを送ります。
