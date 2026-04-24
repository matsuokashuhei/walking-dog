# Modularity Review — `apps/mobile/`

**Model:** Balanced Coupling (Vlad Khononov) — `BALANCE = (STRENGTH XOR DISTANCE) OR NOT VOLATILITY`
**Date:** 2026-04-24
**Scope:** `/Users/matsuokashuhei/Development/walking-dog/apps/mobile/` (React Native / Expo, managed workflow)

---

## Context

`apps/mobile/` は walking-dog のフロントエンド。プロダクトビジョン（`CLAUDE.md`）の 3 軸 — 犬の体験（出会い）／データによる散歩の最大化／飼い主の貢献心 — のうち、**犬同士の交流（BLE encounter）と GPS 散歩記録が core subdomain** にあたり、プロダクトの競争優位を生む部分。

直近でモバイル側に 3 件のリファクタ計画（`apps-mobile-ticklish-rossum.md` など）が積まれ、既に `formatDuration` / `formatDistance` 重複や `WalkEventActions.tsx`/`WalkControls.tsx` の SRP 違反が認識されている。本レビューはそれを Balanced Coupling 観点で再整理し、**どの不均衡が揮発性のある領域にあるか**を優先順位づけすることを目的とする。

既に良く出来ている点（後述「Healthy」セクション）は現状維持し、**core subdomain（walk / encounter）に集中する 2 件の HIGH** を最短で解消するのがゴール。

---

## Domain Classification

| Subdomain | Area | Classification | Volatility | Reason |
|-----------|------|----------------|------------|--------|
| Walk recording | `stores/walk-store.ts`, `lib/walk/*`, `components/walk/*`, `app/walk-recording*.tsx` | **Core** | **High** | プロダクトビジョンの差別化機能。イベント種別・サマリ・Live Activity は継続的に変化する |
| BLE encounter | `lib/ble/*`, `hooks/use-encounter-session.ts`, `use-ble-session.ts` | **Core** | **High** | "犬同士の交流を親密にする" の直接実装 |
| Dog / member / invite | `hooks/use-dog*.ts`, `app/dogs/**`, `app/invite/**` | **Supporting** | Medium | 家族共有・招待などビジネス固有だが差別化ではない |
| Auth | `stores/auth-store.ts`, `lib/auth/*`, `app/(auth)/*` | **Generic** | **Low** | Rust API 経由で Cognito に委譲済み、モバイル側は薄いクライアント |
| GraphQL client | `lib/graphql/*` | **Generic** | **Low** | `graphql-request` ベース、ヘッダーインターセプト型の単純な実装 |
| UI primitives | `components/ui/*`, `theme/*` | **Generic** | **Low** | Button / TextInput / GroupedCard などドメインに依存しない |
| i18n / Sentry / storage | `lib/i18n`, `lib/monitoring`, `lib/storage` | **Generic** | **Low** | `initSentry` は現状 stub |

---

## Findings (Summary)

Balance Rule で **unbalanced かつ high-volatility** なものを優先。低揮発性領域は軽微なものに留まるため informational として記載。

| # | Severity | Area | Issue | BC lens |
|---|----------|------|-------|---------|
| **H1** | **High** | Walk (core) | `WalkEvent` 種別の知識が 3〜4 箇所で暗黙に重複共有 | Model coupling at low distance, **high volatility** → cascading change |
| **H2** | **High** | Walk / Live Activity (core) | `lib/walk/live-activity.ts` の module-level mutable state が `walk-store` の外に存在 | Implicit coupling — 単一真実源の invariant が破れている |
| M1 | Medium | Walk (core) | UI コンポーネントが `walk-store` 内部にインデックス直アクセス（facade hook 欠落） | Model coupling at low distance、一貫性が無い |
| M2 | Medium | Walk / Network boundary | walk event の offline queue 不在（ミューテーション直叩き） | High strength × high distance × high volatility、ただし「欠けた抽象」 |
| L1 | Low | Cross-cutting | `app/_layout.tsx` で Sentry/i18n を side-effect 初期化 | Generic subdomain なので `NOT VOLATILITY` でパス。cosmetic |
| L2 | Low | Walk / format | `WalkMap.tsx` が props と store を両方参照（知識取得元の不統一） | 内部一貫性の問題 |

次章で各 issue を詳細化する。

---

## H1 — Walk event-type knowledge is duplicated across 3 sites (HIGH)

### Symptom

`WalkEvent.eventType` の列挙（`pee` / `poo` / `photo`）とその表示知識が複数箇所に散っている。

- `components/walk/WalkEventActions.tsx:16-20` — `EVENT_ORDER` 定数（アクション順）
- `components/walk/DogEventActionRow.tsx:6-10` — 同じ構造の `EVENT_ORDER` を再定義
- `components/walk/PerDogSummaryCard.tsx:71` — 絵文字 `"💧 💩 📷"` を文字列リテラルでハードコード
- `lib/walk/event-emojis.ts:3-7` — `EVENT_EMOJIS` マップ（「正」のはずのソース）

加えて「イベント数を数える」ロジックが 3 箇所に分散：

- `WalkEventActions.tsx:178-185` — `tallyByType(events, type, dogId?)`
- `PerDogSummaryCard.tsx:92-101` — `countFor(events, type, dogId)`（ほぼ同じ）
- `lib/walk/format.ts:166-178` — `countWalkEvents(events)`（`{pee, poo}` のみカウント、`photo` を除外）

### Coupling assessment

- **Strength:** **model coupling**（複数モジュールが同じドメイン概念のシェイプを知っている）。しかも **implicit**（型定義ではなく定数・リテラルを通じて）。
- **Distance:** **low**（ほぼ全て `components/walk/` と `lib/walk/` 配下、同チーム、同プロセス）。
- **Volatility:** **high**。プロダクトビジョンが「散歩をデータ化して蓄積」なので、**新イベント種別（water / rest / play 等）の追加は必然**。また、表示順序・絵文字・カウント対象のポリシー（`photo` を散歩活動カウントに含めるか等）も UX 調整が入り続ける領域。

### Why this is a balance violation

Balance Rule 的には「low distance + model strength」は一般に許容される（同一モジュール内の model coupling は cohesion）。しかし本件の問題は **duplication による implicit sharing**。

Khononov の言葉では *"duplicated business rules"* は典型的に危険で、(strength=model) × (distance=low) × (volatility=high) が重なると、**新イベント 1 種類の追加で 3〜4 ファイルが lockstep で変わる** — これが "ball of mud / cascading change" の症状。

### Recommendation

`lib/walk/event-emojis.ts` を **単一の真実源**に昇格し、周辺定数・集計関数をそこに集める：

1. `lib/walk/events.ts`（または既存 `event-emojis.ts` を拡張）に以下を集約
   - `EVENT_ORDER: readonly WalkEventType[]`
   - `EVENT_EMOJIS: Record<WalkEventType, string>`
   - `countEventsByType(events, type, opts?: { dogId? }): number`（既存の 3 実装の合流）
   - `countWalkActivityEvents(events): number`（散歩活動としてカウントする種別だけ）
2. `WalkEventActions.tsx` / `DogEventActionRow.tsx` / `PerDogSummaryCard.tsx` / `format.ts` から重複実装を削除し、新モジュールを import
3. 既存テスト（`*.test.tsx`）は振る舞いベースのため、そのまま green でいけるはず
4. 追加で：新イベント種別が増えたら 1 ファイル追加するだけで済むことを ADR 的にコメント

**Verification:** 既存の `WalkEventActions.test.tsx` / `PerDogSummaryCard.test.tsx` / `format.test.ts` が全て green で維持されればリグレッションなし。Jest で重点再実行。

---

## H2 — Live Activity state is module-level mutable, hidden from `walk-store` (HIGH)

### Symptom

`lib/walk/live-activity.ts:25-26` が iOS Live Activity の状態をモジュールスコープで保持：

```ts
let currentActivityId: string | null = null;
let lastUpdateAt = 0;
```

これは以下の箇所から暗黙に読み書きされる：

- `hooks/use-walk-session.ts` — `start()` で `startLiveActivity({})`、`stop()` で `endLiveActivity()`
- `lib/walk/tracking-manager.ts` — GPS 点追加のたびに `updateLiveActivityDistance(distanceM)` をコール

一方、`stores/walk-store.ts` は「walk session の単一真実源」のはずだが、**Live Activity の ID / 最終更新時刻はここに入っていない**。

### Coupling assessment

- **Strength:** **intrusive**。`walk-store` と `live-activity` は walk session というライフサイクルを**共有**しているのに、片方の state が他方に対して不可視。外部から見ると walk-store が単一真実源に見えるが、実際は Live Activity の状態が module variable に漏れている。
- **Distance:** low（同一 `lib/walk/` 配下）。
- **Volatility:** high（iOS 26 Liquid Glass の Live Activity UX 変更が直近で入った — `now.md` の "migrated tab bar to NativeTabs" の流れでここも変わる可能性が継続する core subdomain）。

### Why this is a balance violation

これは古典的 "hidden mutable state" で、BC 文脈では **implicit coupling の最悪ケース**。

- クラッシュ / Hot reload / React Fast Refresh で `currentActivityId` が残留すると、iOS 上に孤立した Live Activity が残る
- オンボーディング時に新規開発者が `walk-store.ts` を読んでも「Live Activity の生存期間」を掴めない
- テストで walk-session を mock しても、live-activity の module state は残り、テスト間干渉のリスク

### Recommendation

Live Activity の identity と生存を **walk-store に引き上げる**：

1. `walk-store` の state に `liveActivity: { activityId: string; startedAt: number; lastUpdateAt: number } | null` を追加
2. `live-activity.ts` は **純粋なアダプタ**（iOS ネイティブ呼び出しの薄いラッパー）に縮退させ、module variable を削除
3. session のライフサイクルは `use-walk-session.ts` が store を通じて制御（`start` で setLiveActivity、`stop` で null）
4. 起動時に store から `liveActivity` を復元して孤立 activity を cleanup できる余地を残す（recovery は別 PR で可）

**Verification:** `use-walk-session.test.ts` と `tracking-manager.test.ts` に「Live Activity state が store に反映されるか」のケースを追加。既存の iOS 実機でのマニュアル walk 開始→終了フローで Live Activity が残らないことを確認。

---

## M1 — UI components reach directly into `walk-store` internals

### Symptom

- `WalkEventActions.tsx:29-34` — `walkId` / `points` / `events` / `addEvent` / `cameraRequestedAt` を個別 selector で取得、**`addEvent` を直接コールして store を変更**
- `WalkMap.tsx:13-17` — `events` を props で受け取りつつ、`points` は store から直接購読（knowledge の取得元が不統一）

### Coupling assessment

- **Strength:** model（コンポーネントが store の shape を知る）
- **Distance:** low（同一 app、別ディレクトリ）
- **Volatility:** medium-high（walk-store の shape は feature 追加で変わる）

同ドメイン内 model coupling は許容範囲だが、**他の UI コンポーネント（settings / dogs）は hook 経由で store を触るのにここだけ直アクセス**しているため、一貫性が欠ける。

### Recommendation

- `hooks/use-walk-event-recorder.ts` に store への write（`addEvent`）と mutation（`recordWalkEvent`）を両方包むよう拡張、または新規に `useWalkEventActions()` を切って `WalkEventActions.tsx` からは hook 経由で触らせる
- `WalkMap.tsx` は「props で渡す」または「store から取る」のどちらかに統一（React Native のコストを考えると、同一画面なら store 購読の方が合理的）

これは H1 のリファクタと自然に一緒にできる。**H1 と同 PR に収めるのが推奨**。

---

## M2 — No offline queue for walk events

### Symptom

`hooks/use-walk-event-recorder.ts` は `recordWalkEvent.mutateAsync` を直接コールし、ネットワークエラー時の queue / retry ロジックを持たない。`hooks/use-walk-mutations.ts` の `addWalkPoints` も同様で、GPS 点のバッチ送信が失敗した場合の永続化が無い。

### Coupling assessment

- **Strength:** functional（API を通した関数呼び出し）
- **Distance:** **high**（モバイル ↔ Rust API、ネットワーク越え）
- **Volatility:** high（core subdomain、ユーザー体験上データ損失は致命）

これは純粋な coupling issue というより **missing abstraction**。BC 文脈で言うと「距離があるところに強い coupling があるが、volatility 高いため `NOT VOLATILITY` でパスできない」ケース。

### Recommendation

この PR では **記録のみ**。実装は別タスク化：

- `lib/walk/event-outbox.ts` のような AsyncStorage ベースの outbox パターン
- `use-walk-event-recorder` が mutation 失敗時に outbox へ enqueue、NetInfo online 復帰時に flush
- GPS 点のバッチも同様

既に M2 は `apps-mobile-ticklish-rossum.md` など別プランの範囲外。本レビューは **リスクを明示して別 PR に切り出す**だけに留める。

---

## L1 — Sentry / i18n are initialized as side effects in `app/_layout.tsx`

### Symptom

- `app/_layout.tsx:6` — `import '@/lib/i18n'`（side-effect import）
- `app/_layout.tsx:22` — `initSentry()` をトップレベルで直接コール

### Coupling assessment

- **Strength:** intrusive（順序依存の side effect）
- **Distance:** low（layout が lib を import）
- **Volatility:** **low**（Sentry は現状 stub、i18n も generic subdomain）

Balance Rule: `NOT VOLATILITY` 項でパス。**現状放置でも BC 的には問題なし**。

### Recommendation

触らないでよい。将来 Sentry を本格有効化する PR のタイミングで：

- `hooks/useInitializeApp()` を切って `_layout.tsx` 内の初期化を hook 化
- Sentry の `ErrorBoundary` を `AppProviders` に追加

それまでは現状維持。

---

## L2 — `WalkMap.tsx` mixed data sources

M1 と合流する軽微な一貫性の問題。M1 の recommendation に含めて処理すれば解消。

---

## Healthy — 維持すべき設計（変更不要）

BC レンズで見て **バランスが取れている**または **generic/low-volatility で問題化しない**箇所：

### Auth — API 経由の Cognito 委譲（Generic, Low volatility）

- `lib/auth/api.ts`, `stores/auth-store.ts`, `lib/auth/bootstrap.ts`
- モバイル側に Cognito SDK は無く、全て Rust API 経由（CLAUDE.md メモリの `feedback_auth_via_api` 原則と一致）
- トークンは `expo-secure-store` と zustand store の 2 層で、`setAuth()` / `refreshAuth()` の境界でのみ同期 — reactive loop を避ける良い設計
- GraphQL client は `setAuthToken(token)` のグローバル header interceptor — 単純で明快

**BC 評価:** strength=model × distance=low × **volatility=low** → `NOT VOLATILITY` でパス。**触らない**。

### View-model hooks pattern — 画面ごとの orchestration layer

- `use-dog-detail-view-model.ts`, `use-walk-screen-view-model.ts`, `use-settings-screen-view-model.ts` など
- 各画面 1:1 対応、cross-screen 再利用なし
- queries / mutations / navigation / local UI state をまとめる役割が明確

**BC 評価:** 画面間の距離が切れており、変更は画面内に閉じる。cohesion 良好。**維持**。

### Encounter tracker — 分離された core logic

- `lib/ble/encounter-tracker.ts` は純粋ロジック（pending map + cleanup timer の内部 state だけ）
- session 管理は `hooks/use-encounter-session.ts` に分離、walk-store にも直接は触らない

**BC 評価:** 同じ core subdomain 内で **strength=functional × distance=low** のバランスが取れている。

### GraphQL type boundary

- `WalkEvent` / `Encounter` / `Walk` / `WalkPoint` / `WalkPointInput` は mutation hook・store・display component など **boundary-aware な場所にのみ**現れる
- UI コンポーネントが直接 `graphql-request` や schema shape を操作しない

**BC 評価:** contract coupling が効いている典型例。**維持**。

### Haversine distance — 単一実装

`lib/walk/distance.ts` の `haversineDistance` は `walk-store.ts:74` からのみ呼ばれる。重複なし。**維持**。

---

## Prioritized Action Plan

| Order | Issue | Effort | Impact | PR scope |
|-------|-------|--------|--------|----------|
| 1 | **H1** Event-type consolidation | M | High | `lib/walk/events.ts` 新設、3〜4 ファイルから重複除去、テスト維持 |
| 1 | **M1 / L2** UI facade for event actions + WalkMap 整合 | S | Medium | H1 と同 PR に収める（hook 経由 write の統一） |
| 2 | **H2** Live Activity state → walk-store | M | High | store state 拡張、`live-activity.ts` をアダプタに縮退 |
| 3 | **M2** Walk event offline outbox | L | High | 別 PR、設計議論 + AsyncStorage outbox |
| — | L1 Sentry/i18n initialization | — | Low | Sentry 本番化のタイミングで tackle、今は放置 |

既存の `apps-mobile-ticklish-rossum.md`（formatter 統合 Phase A–K）は M1 と隣接するので、**H1 PR と ticklish-rossum Phase A を同時期にマージすると `components/walk` が一度に整う**。

---

## Critical files to modify

### For H1 + M1 + L2（同 PR 推奨）

- `lib/walk/event-emojis.ts` → `lib/walk/events.ts` に拡張（または改名）
- `components/walk/WalkEventActions.tsx`
- `components/walk/DogEventActionRow.tsx`
- `components/walk/PerDogSummaryCard.tsx`
- `components/walk/WalkMap.tsx`
- `lib/walk/format.ts`（`countWalkEvents` を新モジュールに移動）
- `hooks/use-walk-event-recorder.ts`（必要なら store write を吸収）

### For H2（別 PR）

- `stores/walk-store.ts`（liveActivity state 追加）
- `lib/walk/live-activity.ts`（module variable 削除、純アダプタ化）
- `hooks/use-walk-session.ts`（store 経由で Live Activity 制御）
- `lib/walk/tracking-manager.ts`（updateLiveActivityDistance 呼び出し経路見直し）

### Tests to update

- `components/walk/WalkEventActions.test.tsx`
- `components/walk/PerDogSummaryCard.test.tsx`
- `lib/walk/format.test.ts`
- `hooks/use-walk-session.test.ts`
- `lib/walk/tracking-manager.test.ts`

---

## Verification

### H1 + M1 + L2

1. `docker compose run --rm mobile npm test -- components/walk lib/walk` が全て green
2. iOS シミュレータで walk 開始 → pee / poo / photo イベント登録 → PerDogSummary が正しい数字を出す
3. 新イベント種別を 1 つ追加する実験（ローカル try-run）を行い、**`lib/walk/events.ts` 1 ファイル追加だけで完結する**ことを確認
4. TypeScript `tsc --noEmit` でリグレッションなし

### H2

1. `docker compose run --rm mobile npm test -- lib/walk/live-activity hooks/use-walk-session tracking-manager` が green
2. iOS 実機で walk 開始 → アプリを強制終了 → 次回起動時 Live Activity が残らない（または recovery ロジックで片付く）ことを確認
3. Hot reload 中に `walk-store` を変更しても Live Activity の二重起動が発生しないこと

### Overall

- Jest 全テスト green
- `docker compose run --rm mobile npx tsc --noEmit` 成功
- ESLint green
- 実機 1 回の walk record → stop までマニュアル確認
