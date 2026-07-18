# Current Product Gaps

この文書は再実装時の移行・比較に使う非正本の差分一覧です。現行挙動を仕様へ昇格させるものではありません。

| Area | Observed in input material | Canonical target |
| --- | --- | --- |
| Authentication | password前提の表現が混在 | email OTP passwordlessのみ |
| Naming | 人間を複数のsystem用語で表現 | `User` / `UserId`へ統一 |
| History list | 独立一覧とSee all導線がない | `/walks`とDog filter一覧を提供 |
| Pagination | 大量取得後にclient filter、cursor未利用 | server-side filterとkeyset cursor |
| Units | 一部画面がkm固定 | Profile preferenceに全画面が追従 |
| Error states | loading、not found、取得失敗が同じ表示になる箇所 | loading/empty/error/not-found/incompleteを分離 |
| Weekly metrics | 最初の一定件数からclient集計 | event projectionで全件集計 |
| Walk/Track | lifecycle、GPS保存、距離算出の境界が曖昧 | Walk SessionとTrack Recordingを契約分離 |
| Data ownership | 共有model/DBによる横断変更の可能性 | context別schema/principal、cross-context FK禁止 |
| Media | objectとdomain関連が混ざる可能性 | Mediaはbinary、利用contextはsemantic referenceを所有 |
| Finish experience | 終了後metadataの採否が未固定 | summary表示後に任意保存または明示skip |
| Profile design | phone/location/bio/sharing/achievement/password/deleteを含む | DEC-008により初期scope外 |

再実装ではこの表の現行側へ互換させず、canonical targetを満たすmigrationまたは置換を計画します。
