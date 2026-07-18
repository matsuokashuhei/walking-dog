# プロダクト仕様書アーキテクチャ設計

**日付:** 2026-07-18

**状態:** 承認済み

**対象:** walking-dogの再構築に使用するプロダクト仕様書の構成と正本ルール

## 1. 目的

walking-dogをゼロから再構築できるプロダクト仕様書を定義する。

仕様書の主な読者は実装を担当するAIエージェントと開発者である。AIエージェントが読む範囲、変更する範囲、検証する範囲を小さく保ち、人間がコードと仕様を理解する認知コストも抑える。

そのため、仕様書と将来の実装を、マイクロサービスやマイクロフロントエンドに似た、機械的に越えられないコンテキスト境界へ分割する。初期段階では独立デプロイを必須にせず、単一リポジトリと共同デプロイを許容する。ただし、コード依存、データ所有、公開契約は最初から分離し、後から各コンテキストを独立サービスとして切り出せる状態を維持する。

## 2. 正本と入力資料

新しい正本は `docs/spec/` 以下に作成するコンテキスト別仕様である。

- `docs/tmp-testcases/` は、期待される挙動と受け入れ条件を抽出する入力資料としてのみ使う。
- `docs/design.html` は、画面、ナビゲーション、表示状態を抽出する入力資料としてのみ使う。
- 現行バックエンドコードは、理想仕様の正本にしない。
- `docs/er.md` は、正本、参考仕様、移行元のいずれにも使用しない。新しいデータ仕様が作成された後に削除する。

入力資料に含まれる現行挙動、理想要件、既知不具合、未決事項はそのまま転記しない。プロダクト判断を行い、規範的な仕様へ書き直す。現行実装との差は新仕様の根拠にせず、必要な場合だけ `docs/spec/decisions/current-product-gaps.md` に記録する。

## 3. 比較した構成

### 3.1 資料別構成

UI、テストケース、API、DBを別々の正本にする構成。開始は簡単だが、同じ機能の仕様が複数資料へ分散し、変更時に同期が崩れやすい。

### 3.2 単一仕様書

全機能を一つの文書にまとめる構成。検索は容易だが、AIエージェントが広いコンテキストを読む必要があり、局所的な変更や置き換えに向かない。

### 3.3 ジャーニー中心構成

ユーザーの行動単位でUI、API、データ、受け入れ条件を縦にまとめる構成。Harness-first開発と相性がよい一方、一つのジャーニーが複数機能を横断するため、仕様の最上位に置くと境界が曖昧になる。

### 3.4 コンテキスト中心構成

明確な所有権を持つ7コンテキストを正本の最上位に置き、ジャーニーはコンテキスト間の接続だけを記述する構成。本設計ではこの案を採用する。

## 4. コンテキストマップ

次の7コンテキストを採用する。

| コンテキスト | 所有する責務 | 所有しない責務 |
| --- | --- | --- |
| Identity & Access | ユーザー登録、OTP、認証、セッション、トークン、メール変更 | ユーザープロフィール |
| User Profile | 名前、プロフィール、設定、飼い主向け表示 | 認証資格情報 |
| Dog Management | 犬、ユーザーと犬の関係、犬プロフィール、散歩目標 | 散歩履歴の集計 |
| Walk Session | 散歩開始、参加犬、散歩イベント、終了、復旧、状態遷移 | GPS点の物理保存、履歴集計 |
| Track Recording | GPS取込、順序、重複排除、品質判定、距離確定 | 散歩の開始・終了判断 |
| History & Insights | 履歴、集計、目標進捗、週次統計、読み取りモデル | 散歩原本の更新 |
| Media | アップロード、画像検証、所有権、保存、配信 | 犬や散歩との意味的な関連付け |

App Shellはプロダクトコンテキストに数えない。認証状態、ナビゲーション、機能登録、共通テーマだけを扱い、ドメイン判断を持たない薄い合成層とする。

各コンテキストがバックエンド、フロントエンド、データストアを必ず一つずつ持つ必要はない。Track Recordingのようなバックエンド中心のコンテキストや、Mediaのような共通能力も、同じ所有境界と契約規則に従う。

## 5. 仕様書の全体構成

```text
docs/spec/
├── README.md
├── architecture/
│   ├── context-map.md
│   ├── boundary-principles.md
│   ├── dependency-policy.md
│   ├── agent-context-policy.md
│   ├── frontend-composition.md
│   ├── data-ownership.md
│   ├── cross-context-consistency.md
│   └── replaceability.md
│
├── contexts/
│   ├── identity-access/
│   ├── user-profile/
│   ├── dog-management/
│   ├── walk-session/
│   ├── track-recording/
│   ├── history-insights/
│   └── media/
│
├── contracts/
│   ├── registry.md
│   ├── synchronous/
│   ├── events/
│   └── compatibility-policy.md
│
├── journeys/
│   ├── sign-up-and-register-dog.md
│   ├── complete-single-dog-walk.md
│   ├── complete-group-walk.md
│   ├── recover-active-walk.md
│   └── review-walk-history.md
│
├── platform/
│   ├── app-shell.md
│   ├── security.md
│   ├── observability.md
│   ├── deployment.md
│   └── testing.md
│
└── decisions/
    ├── requirement-traceability.md
    ├── open-decisions.md
    └── current-product-gaps.md
```

`docs/spec/README.md` は、正本の場所、読み始める場所、文書間の優先順位を示す。ジャーニー文書は機能詳細を複製せず、コンテキスト間の呼び出し、イベント、失敗時の整合性だけを記述する。

## 6. コンテキスト仕様の共通テンプレート

各コンテキストは次の自己完結した構成を持つ。

```text
contexts/<context>/
├── CONTEXT.md
├── context.yaml
├── product-purpose.md
├── boundary.md
├── domain-model.md
├── state-machines.md
│
├── use-cases/
├── frontend/
│   ├── routes.md
│   ├── screens.md
│   ├── ui-states.md
│   └── local-state.md
│
├── api/
│   ├── operations.md
│   ├── authorization.md
│   ├── errors.md
│   └── idempotency.md
│
├── data/
│   ├── README.md
│   ├── domain-model.md
│   ├── invariants.md
│   ├── schema.sql
│   ├── access-patterns.md
│   ├── consistency.md
│   ├── lifecycle.md
│   ├── privacy-and-retention.md
│   └── fixtures/
│
└── acceptance/
    ├── scenarios.md
    ├── fixtures.md
    └── evidence.md
```

技術上不要なファイルは空のまま作らない。例えばフロントエンドを持たないコンテキストは `frontend/` を省略し、PostgreSQLを使わないコンテキストは `schema.sql` を別の機械可読契約へ置き換える。

`CONTEXT.md` はAIエージェントが最初に読む短い入口であり、次だけを記載する。

- コンテキストの目的とプロダクト3軸への影響
- 所有する責務と明示的な対象外
- 公開する契約と利用する契約
- 許可された依存先
- 変更時に実行する検証

`context.yaml` は同じ境界を機械検証するマニフェストである。依存先、公開契約、所有データ、禁止importを宣言し、CIが違反を拒否する。

## 7. 正本の優先順位

仕様に矛盾がある場合は次の順序で解決する。

1. コンテキストの `domain-model.md` と `invariants.md`
2. `schema.sql`、JSON Schema、YAMLなどの機械可読契約
3. `access-patterns.md`
4. 公開APIとイベント契約
5. 受け入れシナリオ
6. 実装コードとマイグレーション

実装または稼働状態が正本と異なる場合、仕様を黙って実態へ合わせない。仕様変更として意思決定を行い、正本を更新してから実装を変更する。

要件IDはコンテキスト単位にする。

- `IDA-*`: Identity & Access
- `USR-*`: User Profile
- `DOG-*`: Dog Management
- `WKS-*`: Walk Session
- `TRK-*`: Track Recording
- `HIS-*`: History & Insights
- `MED-*`: Media
- `JNY-*`: 横断ジャーニー
- `PLT-*`: プラットフォーム

## 8. データ仕様の正本

巨大な全体ER図は正本にしない。各コンテキストが、自分のデータの意味、制約、物理schema、アクセスパターン、ライフサイクルを所有する。

### 8.1 初期データ所有

| コンテキスト | 所有するデータ |
| --- | --- |
| Identity & Access | `users`、外部認証ID、認証状態、メール状態 |
| User Profile | `user_profiles`、`user_preferences` |
| Dog Management | `dogs`、`user_dog_roles`、`dog_walk_goals` |
| Walk Session | `walks`、`walk_participants`、`walk_events`、写真参照 |
| Track Recording | `track_points`、取込状態、距離確定情報 |
| History & Insights | 履歴、日次集計、週間集計などの再構築可能な読み取りモデル |
| Media | `media_assets`、オブジェクト、アップロード状態 |

この表は所有境界を定義する。物理テーブル名、カラム、制約は、各コンテキストのユースケース、不変条件、アクセスパターンから定義する。

### 8.2 技術別の機械可読契約

- PostgreSQL: `schema.sql`
- DynamoDB: `dynamodb-table.yaml`、`item-schema.json`、`access-patterns.md`
- Cognito: `cognito-user-pool.yaml`、`identity-model.md`
- オブジェクトストレージ: `object-schema.yaml`、`storage-policy.md`
- コンテキスト間イベント: `docs/spec/contracts/events/` のバージョン付きschema

### 8.3 データ境界

- コンテキストを越えるDB外部キーを作らない。
- 他コンテキストのDBへの接続と直接SQLを禁止する。
- コンテキスト間トランザクションを作らない。
- 外部参照は不透明なIDとして保持する。
- 非同期連携はTransactional Outboxと冪等性キーを使う。
- 読み取りモデルは公開イベントから再構築可能にする。
- 物理PostgreSQLを共有する場合も、schemaとDBユーザー権限を分離する。
- 各コンテキストのデータは単独で移行、削除、再構築できるようにする。

## 9. Cognitoとユーザー命名規則

`caretaker` というシステム名称は廃止し、`user` に統一する。

- Cognito User Poolの論理名: `users`
- 環境付き物理名: `walking-dog-{environment}-users`
- 認証主体: `User`
- ID: `UserId` / `user_id`
- プロフィール: `user_profiles`
- 犬との関係: `user_dog_roles`
- コンテキスト名: `user-profile`

`Caretaker`、`caretaker_id`、`caretakers` は新仕様で使用しない。`Owner` はプロダクト原則やユーザー向け文章で犬の飼い主を表す場合だけ使用し、型、API、DB、Cognitoリソース名には使用しない。

## 10. 越えられない境界

境界は規約だけでなく、ビルドとCIで強制する。

- 他コンテキストの内部ソースを直接importしない。
- 連携は公開API、バージョン付きイベント、不透明IDに限定する。
- 公開契約の提供側を一つにし、利用側による再定義を禁止する。
- フロントエンド機能間の直接importを禁止し、App Shellがルートと画面を登録する。
- 共通ライブラリにドメイン判断や共有エンティティを置かない。
- 許可された依存関係を `context.yaml` とアーキテクチャテストで検証する。
- 各コンテキストに専用fixture、テスト、実行コマンドを持たせる。
- 公開契約を維持すれば、コンテキスト内部を全面的に置き換えられるようにする。

共有を許可するのは、ログ、トレーシング、時刻抽象、エラー転送形式などの安定したプラットフォーム機能に限る。共有ライブラリはコンテキストへ依存してはならない。

## 11. APIとイベント契約

API契約には、操作、入力、出力、認可、エラー、冪等性、競合、ページングを記載する。GraphQL、REST、メッセージングなどの具体的な転送技術は、契約の意味を変えずに交換できるようにする。

コンテキスト間の同期呼び出しは、即時の回答が必要な場合に限定する。状態変化の伝播と読み取りモデルの構築にはイベントを使う。

イベント契約には次を必須とする。

- イベント名とバージョン
- 発行元コンテキスト
- 安定した識別子
- 発生時刻と因果関係ID
- payload schema
- 重複受信時の扱い
- 順序保証の範囲
- 互換性と廃止方針

部分失敗は隠さない。再試行、補償、隔離、観測可能性を該当ユースケースとジャーニーに明記する。

## 12. フロントエンド境界

フロントエンドはApp Shellとコンテキスト所有機能に分ける。

- App Shellは画面実装を直接所有しない。
- 各機能は公開route、画面factory、必要な権限、deep linkを登録する。
- 他機能のstore、hook、component、GraphQL documentを直接importしない。
- コンテキスト固有状態はその機能内に閉じる。
- 横断状態は公開契約を通じて同期する。
- Design Systemは見た目とアクセシビリティprimitiveだけを提供し、業務判断を持たない。

## 13. AIエージェントの作業コンテキスト

AIエージェントには原則として次だけを渡す。

1. 対象コンテキストの `CONTEXT.md`
2. 変更対象のユースケース、画面、データ仕様
3. 直接利用する公開契約
4. 対象コンテキストのテストと検証コマンド

横断ジャーニーを変更する場合だけ、関係する複数コンテキストの公開契約を追加で読む。内部実装を読む必要が生じた場合は境界不足として扱い、契約または診断情報を改善する。

## 14. 検証方針

各コンテキストは次の証拠を単独で生成できるようにする。

- ドメイン不変条件の単体テスト
- APIまたはイベントの契約テスト
- データschemaとマイグレーションの一致検証
- 許可されていない依存を拒否するアーキテクチャテスト
- コンテキスト内のUI状態とアクセシビリティテスト
- コンテキスト専用fixtureを使った統合テスト

横断ジャーニーでは、実装詳細ではなく公開契約を通じて、正常系、失敗、再試行、復旧、観測可能性を検証する。

## 15. ビジュアル検討とユーザーフィードバック

ビジュアルコンパニオンで、4コンテキスト、7コンテキスト、9コンテキスト以上の境界粒度を比較した。成果物は `.superpowers/brainstorm/92496-1784355387/content/context-map.html` に保存されている。

ユーザーは、Walk SessionとTrack Recordingを分離する7コンテキスト案を選択した。独立デプロイは初期要件にせず、コード、契約、データ所有を機械的に分離し、将来の切り出しを可能にする方針も承認した。

## 16. この設計の完了条件

本設計に基づく仕様書整備は、次を満たしたときに完了する。

- `docs/spec/` の入口と正本優先順位が定義されている。
- 7コンテキストすべてに `CONTEXT.md` と `context.yaml` がある。
- 各責務、対象外、公開契約、データ所有が重複なく定義されている。
- `docs/tmp-testcases/` と `docs/design.html` の有効な要件が要件IDへ追跡できる。
- `docs/er.md` を使用せず、各コンテキストのデータ仕様がゼロベースで定義されている。
- UI、API、イベント、データ、受け入れ条件が要件IDで接続されている。
- 境界違反を検出する機械的な検証条件が仕様化されている。
- 公開契約だけを使って各コンテキストを単独実装・検証・置換できる。

詳細なテーブル、API operation、イベントpayload、画面状態は、本アーキテクチャ設計に続くコンテキスト別仕様で定義する。本設計はそれらの所有場所、正本、境界、検証方法を確定するものである。
