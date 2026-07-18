# Product Specification Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/tmp-testcases/` と `docs/design.html` を入力として精査し、7つの独立コンテキストから成る新しいプロダクト仕様書を `docs/spec/` に作成する。

**Architecture:** 各コンテキストがドメイン、画面、API、データ、受け入れ条件を所有する。コンテキスト間は公開契約と不透明IDだけで連携し、ジャーニー文書は機能詳細を複製せず接続だけを記述する。DB仕様は旧ERや現行コードから転記せず、ユースケース、不変条件、アクセスパターンからゼロベースで定義する。

**Tech Stack:** Markdown、PostgreSQL DDL、YAML、JSON Schema、GraphQL契約記述、Cognito、DynamoDB、S3互換オブジェクトストレージ

## Global Constraints

- 正本は `docs/spec/` 以下だけに置く。
- `docs/er.md` は使用せず、完成時に削除する。
- `caretaker` 系のシステム名称を廃止し、`user` に統一する。
- Cognito User Poolの論理名は `users`、物理名は `walking-dog-{environment}-users` とする。
- コンテキストを越える外部キー、直接DB参照、内部コードimportを仕様に含めない。
- 共有ライブラリへドメイン判断を移さない。
- `docs/tmp-testcases/` の現行差分や不具合を、そのまま理想要件として採用しない。
- `docs/design.html` の視覚要素は、ドメインルール、認証方式、データ所有と矛盾しないものだけを採用する。
- 各機能は犬の体験、データによる散歩の最大化、飼い主の貢献心への影響を明記する。
- 未決語や仮置き文字列を正本に残さない。解決が別contextに属する場合は公開契約として境界を確定する。
- Harness、CI、validator、アプリケーションコードはこの計画では変更しない。
- Mobile実装を変更しないため、Maestroは `no affected journey` とする。

---

### Task 1: Canonical Specification Foundation

**Files:**

- Create: `docs/spec/README.md`
- Create: `docs/spec/architecture/{context-map,boundary-principles,dependency-policy,agent-context-policy,frontend-composition,data-ownership,cross-context-consistency,replaceability}.md`
- Create: `docs/spec/contracts/{registry,compatibility-policy}.md`
- Create: `docs/spec/contexts/{identity-access,user-profile,dog-management,walk-session,track-recording,history-insights,media}/{CONTEXT.md,boundary.md}`

**Interfaces:**

- Consumes: `docs/superpowers/specs/2026-07-18-product-specification-architecture-design.md`
- Produces: 7コンテキストの固定ID、責務、依存方向、正本優先順位

- [ ] `docs/spec/README.md` に正本、読書順序、優先順位、入力資料の非正本性、要件prefixを記載する。
- [ ] context mapに7コンテキストのOwns/Does Not OwnとApp Shellの薄い責務を記載する。
- [ ] boundary文書にdirect import、foreign DB access、cross-context FK、共有domain modelを禁止する規則を記載する。
- [ ] data ownership文書に技術別の所有先と、PostgreSQL schema/DB principal分離を記載する。
- [ ] consistency文書にOutbox、冪等性、再試行、補償、相関IDを記載する。
- [ ] 各 `CONTEXT.md` にPurpose、Product Axes、Owns、Does Not Own、Published Contracts、Consumed Contracts、Allowed Dependencies、Reading Scopeを記載する。
- [ ] contract registryに提供側だけが契約を所有する規則を記載する。

Verification:

```bash
find docs/spec -type f | sort
rg -n 'T''BD|T''ODO|FIX''ME|caretaker' docs/spec
git diff --check -- docs/spec
```

Expected: foundationファイルと14個のcontext入口が存在し、禁止語・仮置き・whitespace errorはない。

Commit:

```bash
git add docs/spec
git commit -m "docs: establish bounded product specification"
```

---

### Task 2: Identity & Access Specification

**Files:**

- Create: `docs/spec/contexts/identity-access/{product-purpose,domain-model,state-machines}.md`
- Create: `docs/spec/contexts/identity-access/use-cases/{sign-up,sign-in,refresh-session,change-email,sign-out}.md`
- Create: `docs/spec/contexts/identity-access/frontend/{routes,screens,ui-states}.md`
- Create: `docs/spec/contexts/identity-access/api/{operations,authorization,errors,idempotency}.md`
- Create: `docs/spec/contexts/identity-access/data/{README.md,invariants.md,cognito-user-pool.yaml,schema.sql,lifecycle.md}`
- Create: `docs/spec/contexts/identity-access/acceptance/scenarios.md`

**Interfaces:**

- Consumes: login、signup、email-change testcasesとdesign.htmlのSign In/Sign Up
- Produces: `UserId`、認証状態、UserRegistered/UserEmailChanged/UserSignedOut契約

- [ ] passwordless email OTPを唯一のアプリ認証方式として定義する。
- [ ] OTP request、challenge、verification、session refresh、refresh rotation、sign-outの状態機械を定義する。
- [ ] Cognito User Pool名、属性、app client、token要件、ログ禁止情報を定義する。
- [ ] Identity所有の `users` と外部subject mappingをPostgreSQL DDLで定義する。
- [ ] duplicate request、rate limit、expired OTP、invalid OTP、provider outage、missing rotated tokenのエラーを定義する。
- [ ] Change passwordはpasswordless方式と矛盾するため対象外と明記する。
- [ ] 正常・失敗・再起動・期限切れ・ログ秘匿の受け入れシナリオを定義する。

Verification:

```bash
rg -n 'caretaker|password login|ALLOW_REFRESH_TOKEN_AUTH' docs/spec/contexts/identity-access
rg -n 'UserId|users|EMAIL_OTP|refresh token rotation' docs/spec/contexts/identity-access
git diff --check -- docs/spec/contexts/identity-access
```

Expected: 禁止された名称・認証方式はなく、必須契約が見つかる。

Commit:

```bash
git add docs/spec/contexts/identity-access docs/spec/contracts/registry.md
git commit -m "docs: specify identity and access context"
```

---

### Task 3: Media Specification

**Files:**

- Create: `docs/spec/contexts/media/{product-purpose,domain-model,state-machines}.md`
- Create: `docs/spec/contexts/media/use-cases/{request-upload,complete-upload,read-asset,delete-asset}.md`
- Create: `docs/spec/contexts/media/api/{operations,authorization,errors,idempotency}.md`
- Create: `docs/spec/contexts/media/data/{README.md,invariants.md,schema.sql,object-schema.yaml,storage-policy.md,lifecycle.md}`
- Create: `docs/spec/contexts/media/acceptance/scenarios.md`

**Interfaces:**

- Consumes: user/dog edit、registration、walk photo testcasesとdesign images
- Produces: `MediaAssetId`、MediaReady/MediaDeleted、upload/download契約

- [ ] owner、purpose、content type、size、checksum、object key、statusを持つasset modelを定義する。
- [ ] profile avatar、dog avatar、walk photoのpurposeを区別し、意味的関連は利用contextが所有すると定義する。
- [ ] upload requestからreadyまでの状態と、失敗・期限切れ・削除を定義する。
- [ ] S3 object schema、署名URL、有効期限、画像制約、配信URLを定義する。
- [ ] orphan cleanup、privacy deletion、idempotent completionを定義する。

Verification:

```bash
rg -n 'MediaAssetId|profile_avatar|dog_avatar|walk_photo|checksum|object key' docs/spec/contexts/media
git diff --check -- docs/spec/contexts/media
```

Commit:

```bash
git add docs/spec/contexts/media docs/spec/contracts/registry.md
git commit -m "docs: specify media context"
```

---

### Task 4: User Profile and Dog Management Specifications

**Files:**

- Create: `docs/spec/contexts/user-profile/{product-purpose,domain-model}.md`
- Create: `docs/spec/contexts/user-profile/use-cases/{view-profile,update-profile,update-preferences}.md`
- Create: `docs/spec/contexts/user-profile/frontend/{routes,screens,ui-states}.md`
- Create: `docs/spec/contexts/user-profile/api/{operations,authorization,errors}.md`
- Create: `docs/spec/contexts/user-profile/data/{README.md,invariants.md,schema.sql,lifecycle.md}`
- Create: `docs/spec/contexts/user-profile/acceptance/scenarios.md`
- Create: `docs/spec/contexts/dog-management/{product-purpose,domain-model,state-machines}.md`
- Create: `docs/spec/contexts/dog-management/use-cases/{register-dog,view-dogs,update-dog,remove-dog,set-walk-goal}.md`
- Create: `docs/spec/contexts/dog-management/frontend/{routes,screens,ui-states}.md`
- Create: `docs/spec/contexts/dog-management/api/{operations,authorization,errors,idempotency}.md`
- Create: `docs/spec/contexts/dog-management/data/{README.md,invariants.md,schema.sql,lifecycle.md}`
- Create: `docs/spec/contexts/dog-management/acceptance/scenarios.md`

**Interfaces:**

- Consumes: user、settings、dog testcases、design owner/dog screens、IdentityのUserId、MediaAssetId
- Produces: UserProfile、UserPreferences、DogId、user-dog role、time-based goal契約

- [ ] User Profileにdisplay name、avatar reference、locale、units、appearance、notification preferenceを定義する。
- [ ] passwordlessと重複するemail変更をProfileから除外し、Identityへの導線だけを所有する。
- [ ] design-onlyのphone、location、bio、public sharing、achievementを初期仕様から除外し、理由をtraceabilityへ記録する。
- [ ] Dogにname、breed、gender、birthday、avatar reference、statusを定義する。
- [ ] user-dog relationは `owner` roleを持ち、将来の共同管理を拡張可能にするが招待機能は初期対象外とする。
- [ ] goalをminutes/cycle_days/effective rangeで定義し、distanceをgoalにしない。
- [ ] loading、empty、normal、validation、submitting、error、not-found、deletedの画面状態を定義する。
- [ ] 各contextにPostgreSQL DDL、制約、index、optimistic versionを定義する。

Verification:

```bash
rg -n 'phone|location|bio|achievement|change password' docs/spec/contexts/user-profile
rg -n 'minutes|cycle_days|effective_from|effective_to' docs/spec/contexts/dog-management
git diff --check -- docs/spec/contexts/user-profile docs/spec/contexts/dog-management
```

Expected: 除外機能は「対象外」としてだけ現れ、walk goalの時間仕様が揃う。

Commit:

```bash
git add docs/spec/contexts/user-profile docs/spec/contexts/dog-management docs/spec/contracts/registry.md
git commit -m "docs: specify user and dog contexts"
```

---

### Task 5: Walk Session and Track Recording Specifications

**Files:**

- Create: `docs/spec/contexts/walk-session/{product-purpose,domain-model,state-machines}.md`
- Create: `docs/spec/contexts/walk-session/use-cases/{start-walk,record-event,finish-walk,recover-walk}.md`
- Create: `docs/spec/contexts/walk-session/frontend/{routes,screens,ui-states,local-state}.md`
- Create: `docs/spec/contexts/walk-session/api/{operations,authorization,errors,idempotency}.md`
- Create: `docs/spec/contexts/walk-session/data/{README.md,invariants.md,schema.sql,lifecycle.md}`
- Create: `docs/spec/contexts/walk-session/acceptance/scenarios.md`
- Create: `docs/spec/contexts/track-recording/{product-purpose,domain-model,state-machines}.md`
- Create: `docs/spec/contexts/track-recording/use-cases/{append-points,read-route,finalize-distance}.md`
- Create: `docs/spec/contexts/track-recording/api/{operations,authorization,errors,idempotency}.md`
- Create: `docs/spec/contexts/track-recording/data/{README.md,invariants.md,dynamodb-table.yaml,item-schema.json,access-patterns.md,lifecycle.md}`
- Create: `docs/spec/contexts/track-recording/acceptance/scenarios.md`

**Interfaces:**

- Consumes: walk screen/detail testcases、design single/group flows、UserId、DogId、MediaAssetId
- Produces: WalkId、walk lifecycle events、track ingestion、distance summary契約

- [ ] ready、starting、active、finishing、completed、recovery-requiredのwalk state machineを定義する。
- [ ] 一人のuserが同時に持てるactive walkを一つに制限する。
- [ ] single/group participant、per-dog pee/poop event、walk photo referenceを定義する。
- [ ] start/finish/retryをidempotency keyで重複防止する。
- [ ] background/foreground GPS、offline buffer、resume、permission degradationを定義する。
- [ ] Track PointにWalkId、sequence、recorded_at、coordinates、accuracy、sourceを定義する。
- [ ] DynamoDB keyとaccess patternを、walk単位の順序付き取得と重複排除から設計する。
- [ ] GPS jump、低精度、out-of-order、duplicateを距離へ反映しない規則を定義する。
- [ ] Walk SessionはTrack Recording内部を読まず、distance summary契約だけを使う。
- [ ] post-walk finish summaryを採用し、optional note/mood/weather/tagsはWalk Sessionの完了metadataとして定義する。

Verification:

```bash
rg -n 'ready|starting|active|finishing|completed|recovery-required' docs/spec/contexts/walk-session
rg -n 'sequence|recorded_at|accuracy|duplicate|out-of-order' docs/spec/contexts/track-recording
git diff --check -- docs/spec/contexts/walk-session docs/spec/contexts/track-recording
```

Commit:

```bash
git add docs/spec/contexts/walk-session docs/spec/contexts/track-recording docs/spec/contracts/registry.md
git commit -m "docs: specify walk and track contexts"
```

---

### Task 6: History & Insights Specification

**Files:**

- Create: `docs/spec/contexts/history-insights/{product-purpose,domain-model}.md`
- Create: `docs/spec/contexts/history-insights/use-cases/{list-walks,view-walk,view-dog-insights,view-user-insights}.md`
- Create: `docs/spec/contexts/history-insights/frontend/{routes,screens,ui-states}.md`
- Create: `docs/spec/contexts/history-insights/api/{operations,authorization,errors,pagination}.md`
- Create: `docs/spec/contexts/history-insights/data/{README.md,invariants.md,schema.sql,projections.md,rebuild.md,lifecycle.md}`
- Create: `docs/spec/contexts/history-insights/acceptance/scenarios.md`

**Interfaces:**

- Consumes: dog detail、user screen、walk detail、history testcasesとsource context events
- Produces: walk history、dog/user totals、weekly metrics、goal progress read contracts

- [ ] WalkFinished、TrackDistanceFinalized、DogUpdated、GoalChanged、MediaReadyを消費するprojectionを定義する。
- [ ] read modelは再構築可能で、source recordを更新しないと定義する。
- [ ] cursor pagination、降順、stable tie-breaker、filter、units/localizationを定義する。
- [ ] dog/user totals、weekly graph、goal progress、paceの計算式と失敗時の扱いを定義する。
- [ ] walk detailのroute、participants、events、photos、walker snapshotを定義する。
- [ ] loading、empty、error、retry、not-found、stale projectionを区別する。
- [ ] PostgreSQL read-model DDLとprojection checkpointを定義する。

Verification:

```bash
rg -n 'cursor|stable|projection|rebuild|goal progress|pace' docs/spec/contexts/history-insights
git diff --check -- docs/spec/contexts/history-insights
```

Commit:

```bash
git add docs/spec/contexts/history-insights docs/spec/contracts/registry.md
git commit -m "docs: specify history and insights context"
```

---

### Task 7: Cross-Context Journeys and Product Traceability

**Files:**

- Create: `docs/spec/journeys/{sign-up-and-register-dog,complete-single-dog-walk,complete-group-walk,recover-active-walk,review-walk-history}.md`
- Create: `docs/spec/platform/{app-shell,security,observability,deployment,testing}.md`
- Create: `docs/spec/decisions/{requirement-traceability,product-decisions,current-product-gaps}.md`
- Modify: `docs/spec/contracts/registry.md`

**Interfaces:**

- Consumes: Tasks 2–6の公開契約
- Produces: end-to-endの接続、source-to-requirement mapping、採用・却下判断

- [ ] 各journeyに目的、前提、正常フロー、境界ごとの呼出、イベント、部分失敗、復旧、最終データ状態を記載する。
- [ ] App Shellにroute registration、auth gate、tab ownership、deep linkを定義する。
- [ ] securityにPII/token/OTPログ禁止、context authorization、identity propagationを定義する。
- [ ] observabilityにcorrelation IDとcontext boundary spanを定義する。
- [ ] testcases/designの各入力を要件ID、却下判断、または置換要件へ対応付ける。
- [ ] design-only除外機能と採用したpost-walk summaryをproduct decisionとして記録する。
- [ ] current product gapsは新仕様の根拠ではなく、再構築時に捨てる旧挙動として分離する。

Verification:

```bash
rg -n 'IDA-|USR-|DOG-|WKS-|TRK-|HIS-|MED-' docs/spec/journeys docs/spec/decisions
rg -n 'docs/er\.md' docs/spec
git diff --check -- docs/spec/journeys docs/spec/platform docs/spec/decisions docs/spec/contracts
```

Expected: 全journeyが複数context requirementへ接続され、旧ER参照はない。

Commit:

```bash
git add docs/spec/journeys docs/spec/platform docs/spec/decisions docs/spec/contracts/registry.md
git commit -m "docs: connect product journeys across contexts"
```

---

### Task 8: Remove Legacy ER and Verify Canonical Specifications

**Files:**

- Delete: `docs/er.md`
- Modify: `AGENTS.md`
- Modify: `docs/spec/README.md`

**Interfaces:**

- Consumes: 完成した7 context specifications
- Produces: 旧ERに依存しない単一の正本入口

- [ ] `AGENTS.md` のRequired Readingへ `docs/spec/README.md` とcontext mapを追加する。
- [ ] `docs/spec/README.md` に全context、contracts、journeys、decision logsへの索引を完成させる。
- [ ] `docs/er.md` を削除する。
- [ ] 全Markdown linkを確認する。
- [ ] 全DDL/YAML/JSONで名称、ID、所有contextを照合する。
- [ ] 現行コードや旧ERを根拠とする表現がないことを確認する。

Verification:

```bash
git diff --check
rg -n 'docs/er\.md|caretaker|T''BD|T''ODO|FIX''ME' docs/spec AGENTS.md
find docs/spec/contexts -type f | sort
git status --short
```

Expected:

- whitespace errorなし
- 旧ER、禁止名称、仮置きなし
- 7 contextすべてにdomain、API、data、acceptanceの正本が存在
- 変更は仕様書、`AGENTS.md`、`docs/er.md`削除だけ

Commit:

```bash
git add AGENTS.md docs/spec
git add -u docs/er.md
git commit -m "docs: replace legacy ER with canonical product specifications"
```
