# Solutions: apps/mobile

各課題グループに対する採用解。既存コードで再利用可能な資産 (`theme/tokens.ts`, `hooks/use-themed-styles.ts`, `lib/walk/*`) を優先し、新規依存は追加しない。

## [DRY] isAuthenticated 重複

**候補**
- A: `hooks/use-is-authenticated.ts` として1行ラッパー
- B: 各 query hook の `enabled` オプション側に寄せて呼び出しを排除

**採用**: **A** — 呼び出しパターンが query 以外 (providers, screens) にも波及する可能性があり、中央ラッパーの方がシンプルで将来の selector 変更 (`s.user !== null` など) に耐える。KISS。

## [DRY] invalidate ペア重複

**候補**
- A: `hooks/use-invalidate-user-queries.ts` で `invalidateMeAndDogs()` helper
- B: mutation hook 側に `meta.invalidates` 構造を持たせる

**採用**: **A** — TanStack Query の標準に沿ったシンプルな helper。Bは過剰抽象 (YAGNI)。

## [DRY] hero title style 重複

**候補**
- A: `theme/tokens.ts` に `typography.hero` を追加、画面側を token参照に
- B: `components/ui/HeroTitle.tsx` として component 化

**採用**: **A** — 既存の `typography.h1/h2/body/caption` パターンに一致。Bは余分なコンポーネントラッパー (YAGNI)。

## [DRY] Alert エラーハンドリング重複

**候補**
- A: `hooks/use-mutation-with-alert.ts` で wrapper フック
- B: 各 mutation の onError を `errorPresenter` util で統一

**採用**: **A** — React フック内で `Alert` を翻訳+表示する責務は fetcher とは分離した方がテストしやすい。mutation自体は pure mutation hooks に残し、画面側 wrapper がalert表示を担う。

**参照**: TanStack Query docs — `onError` callback per mutation vs global `QueryCache onError`

## [DRY] EVENT_EMOJIS 重複

**採用**: `lib/walk/event-emojis.ts` に1箇所集約。

## [DRY] カードボーダー + settings section 重複

**候補**
- A: `components/ui/OutlinedCard.tsx` (border + opacity + radius + padding を prop 化)
- B: `theme/tokens.ts` に `card` preset を追加してスタイル参照のみ共通化

**採用**: **A + B ハイブリッド** — token に `colors.cardBorder` (既存 `theme.border + '33'` を alpha 込みで固定) を追加し、`OutlinedCard` コンポーネントで構造を共通化。settings section は `SettingsSection` 別コンポーネント (title + card slot)。

## [KISS + SRP] ConfirmForm OTP / WalkEventActions 写真

**候補**
- A: カスタムフック抽出 (`useOtpInput`, `usePhotoUpload`)
- B: ライブラリ採用 (`expo-otp-input` は存在しない、自前のまま)

**採用**: **A** — 既存ライブラリ依存は追加せず、ロジックのみフックに切り出してコンポーネントは描画のみに。テストが大幅簡素化。

## [SRP] 画面分割 (walk / invite / walks detail / dog detail)

**採用**: 画面はdescriptionのみに戻し、ロジックをカスタムフック + lib ユーティリティに移す。

- `app/(tabs)/walk.tsx` → `hooks/use-walk-session.ts` + `use-ble-session.ts` + `use-encounter-session.ts` + `use-walk-permissions.ts`
- `app/invite/[token].tsx` → `lib/auth/pending-invite-token.ts` + `hooks/use-accept-invite-flow.ts` + `lib/errors/invite-error-map.ts`
- `app/walks/[id].tsx` → `hooks/use-walk-detail-view-model.ts` + `lib/walk/constants.ts` (Tokyo fallback座標を理由コメント付き export)
- `app/dogs/[id]/index.tsx` → `hooks/use-dog-detail-authorization.ts`

**参照**: Expo Router + React の一般的な "container/presentational" 分離パターン。画面ファイルは router の layer に専念。

## [TYPE] 戻り型不一致

**採用**: `hooks/use-encounter-mutations.ts` の戻り型定義を実装に合わせ修正 (`Encounter[]`, `boolean`)。呼び出し側 (WalkScreenの recordEncounter / updateEncounterDuration 利用箇所) も合わせて調整。

## [TYPE] BLE scanner any

**採用**: `react-native-ble-plx` の公式型 (`BleManager`, `Device`, `Subscription`) を直接 import し `any` を排除。lazy-load のため dynamic import ではなく通常 import に変更してもバンドルサイズには影響なし (既に native module として含まれる)。

## [CONCERN] secure-storage migration 毎回実行

**採用**: migration を `auth-store.initialize()` の先頭で1回呼ぶ方式に変更。`getToken()` から migration を除去。auth-storeの初期化でのみ legacy → new へ移行される。

## [CONCERN] GraphQL client refresh middleware 化

**採用**: `lib/graphql/client.ts` の refresh 処理を `lib/graphql/middleware/refresh-on-401.ts` に分離。`authenticatedRequest()` は request 実行のみ、401 検出+リトライは middleware 層。副作用と通信を分離。

## [CONCERN] GraphQL queries/mutations ドメイン分割

**採用**: `lib/graphql/{dog,walk,me,friendship,encounter,auth}.{queries,mutations}.ts` にドメインで分け、`lib/graphql/index.ts` から re-export。既存importは段階的移行 (barrel は `no barrel file` ルールあるが GraphQL ドキュメント集約のみ例外として許容、要判断)。または直接ドメイン別にimport変更する。

**参照**: Apollo公式 Fragment colocation パターンに近い — ドキュメントは利用者近くに置く思想もあるが、ここでは共有クライアント層に残し domain で分割するに留める。

## [YAGNI] 未使用prop/component/フィールド

**採用**: 削除ベース。迷うなら削除ではなく validation追加 (例: `DogForm.gender` は select UI を既に持つので、検証を追加してスキーマに沿うか、逆にUIも削除するかを実装時に user確認)。

- `WalkMap.followUser` → 削除、`showsUserLocation={true}` ハードコード
- `WalkControls` pauseボタン → 削除 (実装予定がない前提)
- `Divider` → インライン置換で削除
- `dogKeys.members()` → 削除
