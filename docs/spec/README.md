# Product Specification

このディレクトリは、walking-dogをゼロから実装するための正本です。対象読者は実装を担当するAIエージェントと開発者です。

## Authority

仕様の意味と優先順位は次の順です。

1. 対象コンテキストのdomain modelとinvariants
2. SQL、YAML、JSON Schemaなどの機械可読schema
3. access patternsとstate machine
4. 公開API・イベント契約
5. acceptance scenarios
6. 実装コード、migration、稼働環境

下位の資料が上位の仕様と異なる場合、上位仕様を黙って変更しません。仕様変更として判断し、正本を先に更新します。

## Read Order

1. [Context Map](architecture/context-map.md)
2. 対象コンテキストの `CONTEXT.md`
3. 変更対象のuse case、frontend、API、data、acceptance
4. 直接利用する公開契約
5. 境界をまたぐ変更だけcross-context journey

## Specification Index

- [Context Map](architecture/context-map.md)
- [Contract Registry](contracts/registry.md)
- [Cross-context Journeys](journeys/README.md)
- [Platform Requirements](platform/README.md)
- [Product Decisions](decisions/product-decisions.md)
- [Requirement Traceability](decisions/requirement-traceability.md)
- [Current Product Gaps](decisions/current-product-gaps.md)

## Contexts

| Prefix | Context | Entry point |
| --- | --- | --- |
| `IDA` | Identity & Access | [CONTEXT](contexts/identity-access/CONTEXT.md) |
| `USR` | User Profile | [CONTEXT](contexts/user-profile/CONTEXT.md) |
| `DOG` | Dog Management | [CONTEXT](contexts/dog-management/CONTEXT.md) |
| `WKS` | Walk Session | [CONTEXT](contexts/walk-session/CONTEXT.md) |
| `TRK` | Track Recording | [CONTEXT](contexts/track-recording/CONTEXT.md) |
| `HIS` | History & Insights | [CONTEXT](contexts/history-insights/CONTEXT.md) |
| `MED` | Media | [CONTEXT](contexts/media/CONTEXT.md) |

横断ジャーニーは `JNY-*`、プラットフォーム要件は `PLT-*` を使います。

## Non-Authoritative Inputs

次の資料は要件候補を抽出する入力であり、正本ではありません。

- `docs/tmp-testcases/`
- `docs/design.html`
- 現在または過去のmobile/backend実装
- 稼働中のデータ構造

入力に含まれる現行挙動、未実装案、既知不具合は、採用判断と要件IDを経るまで仕様になりません。

## System Language

認証された人間は一貫して`User`と呼び、IDは`UserId` / `user_id`とします。Cognito User Poolの論理名は`users`、環境付き物理名は`walking-dog-{environment}-users`です。`Owner`はユーザー向け文章で「犬の飼い主」を説明するときだけ使います。

## Boundary Rules

- 他コンテキストの内部コードをimportしない。
- 他コンテキストのDBへ接続しない。
- コンテキストを越える外部キーを作らない。
- 公開API、バージョン付きイベント、不透明IDだけで連携する。
- 公開契約を守れば、コンテキスト内部を単独で置き換えられるようにする。
