# Product Decisions

| ID | Decision | Reason |
| --- | --- | --- |
| DEC-001 | `docs/spec/`だけを再実装の正本にする | 現行コードや調査資料から理想仕様を逆算しないため |
| DEC-002 | 7つのbounded contextと薄いApp Shellを固定する | AIと人間の読書範囲、変更影響、置換範囲を小さくするため |
| DEC-003 | 初期は単一repository／共有pipelineを許容する | 運用複雑性を抑えつつhard boundaryを先に確立するため |
| DEC-004 | 認証された人間を`User`、Cognito poolを`users`に統一する | 用語と識別子の二重性をなくすため |
| DEC-005 | アプリ認証はemail OTP passwordlessだけにする | password UIとrefresh flowの矛盾を除くため |
| DEC-006 | DBはuse case・invariant・access patternからゼロベースで定義する | 旧ERと現行backendの偶発的構造を引き継がないため |
| DEC-007 | designのWalk finish summaryと任意metadata保存／skipを採用する | 散歩をケアの成果として振り返れるため |
| DEC-008 | phone、location、bio、public sharing、achievement、Change password、self-service account deletionを初期scopeから除外する | 核心journeyに不要、またはpasswordless/privacy/法務仕様が未成立なため |
| DEC-009 | 犬の散歩目標は距離でなく時間、cycleは1日または7日とする | 犬のケア目標として理解・集計しやすいため |
| DEC-010 | Historyはsource eventから再構築可能なread modelにする | source ownershipを守り、表示と集計を独立置換するため |
| DEC-011 | Mediaはbinary lifecycleだけを所有し、avatar/photoの意味的関連は利用contextが持つ | Mediaへの全domain集約を防ぐため |
| DEC-012 | `UserId`は内部UUIDとし、Cognito `sub`をdomain IDにしない | Identity providerの置換と内部参照の安定性を保つため |

Decisionを変更する場合は、影響するcontext仕様、contract、journey、traceabilityを同じ変更で更新します。
