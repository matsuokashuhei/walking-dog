# Boundary Principles

## Hard Boundaries

- context内部のsource、store、hook、repository、entityは外部公開しない。
- context間の同期連携は提供側API、非同期連携は提供側event schemaを使う。
- consumerがprovider contractを複製または独自解釈しない。
- contextごとにdata ownershipを一つにし、foreign database accessを禁止する。
- context外IDは存在だけを示すopaque valueであり、database foreign keyにしない。
- cross-context transactionを作らない。部分失敗は再試行、補償、隔離で扱う。

## Shared Platform

共有できるものはlogging、tracing、clock abstraction、transport envelope、design tokens、accessibility primitivesです。共有層はdomain entity、business validation、feature stateを持ちません。

## Replacement Test

あるcontextを内部から全削除しても、公開contract、owned data migration、consumer contract testsを満たせば他contextを変更せず置き換えられることを境界の完成条件とします。
