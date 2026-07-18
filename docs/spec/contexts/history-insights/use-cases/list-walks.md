# List Walks

認証済み利用者の完了散歩をcursor paginationで返します。任意のDogId filterを指定できます。

- 初期page sizeは20、最大100です。
- cursorは並び順keyを署名付きopaque値にしたものです。
- Dog filterはDogIdで判定し、同名犬を混同しません。
- 複数犬散歩は全体一覧で一件、各参加犬filterでも同じWalkIdの一件として現れます。
- active/finishing/abandoned Walkは含みません。
- projection取得失敗を空一覧として返しません。
