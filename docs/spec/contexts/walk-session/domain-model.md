# Walk Session Domain Model

## Aggregate

`Walk`がaggregate rootです。

| Concept | Meaning |
| --- | --- |
| WalkId | UUID。散歩とTrackを結ぶ公開識別子 |
| UserId | 散歩を実行する利用者。Identity所有 |
| status | `starting`、`active`、`finishing`、`completed`、`abandoned` |
| participant | 開始時点のDogId、犬名、avatar asset参照のsnapshot |
| care event | `pee`または`poop`と発生時刻、任意の位置 |
| photo reference | MediaのAssetIdと散歩内の並び順 |
| completion | 終了時刻、距離、所要時間、任意の感想 |

## Completion Metadata

- `note`: 0..1000文字
- `mood`: `tired`、`okay`、`good`、`great`のいずれか、または未指定
- `weather`: 0..80文字、または未指定
- `tags`: trim済みの重複しない文字列を最大10件、各1..40文字

## Invariants

- 一利用者につき`starting`、`active`、`finishing`の散歩は合計一件までです。
- participantは一件以上で、同じDogIdを重複させません。
- participant snapshotは開始後に変更しません。
- `completed`はTrackの確定summaryと終了時刻を持ちます。
- `abandoned`は履歴の完了実績へ算入しません。
