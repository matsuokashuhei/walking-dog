# Requirement Traceability

入力資料は要件候補であり正本ではありません。この表は候補をどの正本仕様へ採用したか、またはなぜ除外したかを示します。

## Testcase Inputs

| Requirement IDs | Input | Disposition | Canonical specification |
| --- | --- | --- | --- |
| IDA-001..009 | `signup-e2e-test-cases.md` | OTP登録、validation、再送、期限切れ、再起動を採用 | `contexts/identity-access/`、JNY-001 |
| IDA-010..019 | `login-screen-e2e-test-cases.md` | OTP sign-in、session refresh、error秘匿を採用。password loginは不採用 | `contexts/identity-access/`、PLT-002 |
| IDA-020..026 | `email-change-screen-e2e-test-cases.md` | verify後のemail変更と再認証を採用 | `contexts/identity-access/use-cases/change-email.md` |
| USR-001..011 | `settings-screen-e2e-test-cases.md` | locale、units、appearance、notifications、sign-outを採用 | `contexts/user-profile/`、Identity、PLT-001 |
| USR-012..021 | `user-edit-screen-e2e-test-cases.md` | display name/avatarを採用。email編集はIdentityへ移管 | `contexts/user-profile/use-cases/update-profile.md`、JNY-001 |
| USR-022..035 | `user-screen-e2e-test-cases.md` | profile、生涯集計、週次7日graphを採用。固定kmを廃止 | User Profile、History、JNY-005 |
| DOG-001..010 | `dog-registration-e2e-test-cases.md` | 必須name/gender、任意breed/birthday/avatarを採用 | `contexts/dog-management/use-cases/register-dog.md` |
| DOG-011..020 | `dogs-list-e2e-test-cases.md` | loading/empty/error/list/navigationを採用 | `contexts/dog-management/frontend/` |
| DOG-021..037 | `dog-detail-screen-e2e-test-cases.md` | profile、統計、時間目標、直近5Walkを採用 | Dog Management、History、JNY-005 |
| DOG-038..047 | `dog-edit-screen-e2e-test-cases.md` | update/remove、concurrency、avatar更新を採用 | `contexts/dog-management/use-cases/` |
| WKS-001..029 | `walk-screen-e2e-test-cases.md` | 犬選択、複数犬、active記録、offline復旧、finishを採用 | Walk Session、Track Recording、JNY-002/003/004 |
| HIS-001..018 | `walk-history-list-e2e-test-cases.md` | 独立一覧、Dog filter、cursor paging、units連動を採用 | `contexts/history-insights/use-cases/list-walks.md`、JNY-005 |
| HIS-019..038 | `walk-detail-screen-e2e-test-cases.md` | route、metrics、timeline、photo、partial errorを採用 | `contexts/history-insights/use-cases/view-walk-detail.md`、JNY-005 |

## Design Input

| Requirement IDs | `design.html` element | Disposition | Canonical specification |
| --- | --- | --- | --- |
| DES-001..004 | Sign In / Sign Up | visual hierarchyを採用。password fieldは不採用 | Identity frontend |
| DES-005..011 | Dogs list/detail/edit/walking goal | 画面構成と時間目標を採用 | Dog frontend、JNY-002 |
| DES-012..018 | Walk no-dog/start/active/finish/save sheet | 単独・複数犬、finish summary、save/skipを採用 | Walk frontend、JNY-003 |
| DES-019..023 | Walk detail | map、metrics、timeline、photoを採用 | History frontend |
| DES-024..029 | Me/Profile/Settings | profile、集計、言語、単位、通知、appearanceを採用 | User Profile、History、PLT-001 |
| DES-030 | three-tab shell | Dogs / Walk / Meを採用 | PLT-001 |
| DES-031..037 | phone、location、bio、sharing、achievement、Change password、Delete account | 初期scopeから除外 | DEC-008 |

## Cross-cutting Requirements

| ID | Requirement | Specification |
| --- | --- | --- |
| PLT-001 | feature内部を越えないApp Shell | `platform/app-shell.md` |
| PLT-002 | 認証、認可、秘密・位置情報の保護 | `platform/security.md` |
| PLT-003 | correlation、metrics、alert、redaction | `platform/observability.md` |
| PLT-004 | context単位のbuild/runtime/data/deploy isolation | `platform/deployment.md` |
| PLT-005 | local/contract/journey/data testing | `platform/testing.md` |

## Coverage Rule

新しい入力候補は、context requirement、journey、platform requirement、明示的な除外decisionのいずれかへ割り当てます。「現行と同じ」は採否理由になりません。
