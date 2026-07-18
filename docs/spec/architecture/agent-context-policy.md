# Agent Context Policy

AIエージェントには原則として次だけを渡します。

1. 対象contextの`CONTEXT.md`
2. 変更するuse case、screen、API、data、acceptance documents
3. 直接利用する公開contract
4. 対象contextの検証方法

journey変更時だけ、関係contextの公開contractを追加します。他contextの内部実装を読む必要がある場合は、理解不足ではなく境界またはcontract不足として扱います。

一つのtaskで複数contextの内部を同時変更しません。provider contract変更とconsumer対応は別々にレビュー可能な単位へ分割します。
