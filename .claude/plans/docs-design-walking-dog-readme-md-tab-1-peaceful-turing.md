# Tab 1 Dogs — Precise デザインへ pixel-perfect 移行

## Context

`docs/design/walking-dog/project/Precise Full App.html` の Tab 1 Dogs 配下、**01. Dogs (list)**（HTML L603–647）と **02. Dog detail**（HTML L650–719）は現状の React Native 実装と構造的に大きく乖離している。デザインに合わせて UI を作り直す。

現状との主な差分：

| 箇所 | デザイン | 現状実装 |
| --- | --- | --- |
| list の Today ロールアップ | 円形進捗（70%）+「3.52 / 5.0 km across your pack」 | 円アバター内に dog 数 |
| list 行の右側情報 | 🔥 12d streak バッジ ＋「1.42 km today · 47 walks」 | `shared` バッジ ＋ 犬種のみ |
| list の追加 CTA | ヘッダー右 `+ Add` | 右下 FAB |
| detail hero | フルブリード 300px + 絵文字 + `group` 色への fade | 280px `surfaceContainer` 背景に中央寄せ写真 |
| detail ナビバー | 写真にかぶさる透過「‹ Dogs / Edit」 | 通常の Stack ヘッダー |
| detail stats 3列 | Walks / km / **Streak** | Walks / Distance / **Duration** |
| detail メイン | Walks 履歴カード + `See all` | Members/Friends 行 + Edit/Delete ボタン |

ユーザー確認済みの方針（実装を縛る）：

1. 不足フィールド（streak、today km、pack today km）は **クライアント側で walks から算出** して完全一致させる。
2. Today's walking goal は **固定 5 km** をデフォルトゴールに、進捗はクライアント集計。
3. Dog detail の Members/Friends/Delete は **保持**。Edit は **ネイビバー右**、Members/Friends/Delete は Walks 履歴の下に配置。
4. Hero 写真は **photoUrl をフルブリード** 表示し、下に fade-to-background を掛ける。

## Files to modify

### 変更
- `apps/mobile/app/(tabs)/dogs.tsx` — rollup を新コンポーネントに差し替え、FAB 削除、ヘッダー右に `+ Add` を配置（`(tabs)/_layout.tsx` は `headerShown: false` なので、この画面内で `SafeArea` 上端に独自に配置する）
- `apps/mobile/components/dogs/DogListItem.tsx` — 行の meta を streak バッジ + today km · walks に変更。`todayKm`, `walksTotal`, `streakDays` を props で受ける
- `apps/mobile/app/dogs/[id]/_layout.tsx` — `index` 画面のみ `headerTransparent: true, headerTintColor: '#fff', headerBackTitle: 'Dogs', title: ''`、`headerRight` に Edit ボタンを追加
- `apps/mobile/app/dogs/[id]/index.tsx` — hero を full-bleed photo + fade に、stats の 3 列目を Streak に、Walks 履歴を主役にし、Members/Friends/Delete を下に移動
- `apps/mobile/components/dogs/DogStatsCard.tsx` — 3 列目を `Duration` → `Streak` に置換（props で `streakDays` を受け取る）
- `apps/mobile/lib/graphql/queries/walk.ts` — `MY_WALKS_QUERY` に `events { eventType }` を追加（pee/poo カウント表示用）
- `apps/mobile/locales/*/translation.json`（en を先に、ja は別 PR）

### 新規
- `apps/mobile/hooks/use-pack-progress.ts` — `useMyWalks` と `useMe` をラップし、`{ todayKm, goalKm: 5, progressPct, perDog: Record<dogId, { todayKm, totalWalks, streakDays }> }` を返す
- `apps/mobile/components/dogs/PackRollupCard.tsx` — 円形進捗 + タイトル + サブタイトル + chevron
- `apps/mobile/components/dogs/DogHero.tsx` — 300px photo + 下 60px LinearGradient で `theme.background` へ fade
- `apps/mobile/components/dogs/DogWalksList.tsx` — 「Walks / See all」見出し + 履歴カード（空なら EmptyState）
- `apps/mobile/components/dogs/DogWalkRow.tsx` — アイコン + 日付ラベル + `dist · time · pace` + `💧n 💩m` + chevron、`/walks/${id}` へ遷移
- `apps/mobile/components/ui/RingProgress.tsx` — `react-native-svg` (導入済) で円形進捗リング + 中央に `70%`
- `apps/mobile/lib/format/walk.ts` — `formatPace(distanceM, durationSec)`、`formatWalkDateLabel(startedAt)`（Today / Yesterday / 曜日 + 時刻）、`countEvents(events)`
- `apps/mobile/constants/walk.ts` — `DEFAULT_DAILY_GOAL_KM = 5`

## Reuse

- `expo-linear-gradient` は `components/auth/AppMark.tsx:2,16` で導入済み — hero fade に使う
- `react-native-svg` は `package.json:59` に存在 — RingProgress と walk row のチャートアイコンに使う
- `useMyWalks` (`hooks/use-walks.ts:20`) — そのまま再利用、`limit=20` で足りる
- `useMe` (`hooks/use-me.ts:8`) — dog 一覧ソース
- `useColors` / `spacing` / `radius` / `typography` トークン — 既存 palette に準拠
- `GroupedCard` / `GroupedRow` — detail 画面の Members/Friends/Delete 節で継続利用
- Walk detail 画面 `app/walks/[id].tsx` — 既存。Walks 行のタップ先

## Client-side computation ルール

`use-pack-progress` 内で：
- **today 判定**: 端末ローカルタイムゾーンで `startedAt` の YYYY-MM-DD が `new Date()` の当日と一致
- **pack today km**: `todayWalks.reduce((a, w) => a + (w.distanceM ?? 0), 0) / 1000`
- **dog today km**: 当該 dog id を含む walks のみ抽出して同上
- **dog totalWalks**: `walkStats.totalWalks` (当該 dog を `useDog` で取得済み) を優先。list では `useMyWalks` で当該 dog を含む件数を暫定集計
- **streak**: walks を日付集合にまとめ、当日または前日から連続する日付数。walks が 0 なら 0
- **goalKm**: 定数 `DEFAULT_DAILY_GOAL_KM = 5`

## i18n 追加キー（en 先行）

```
dogs.list.todayGoal = "Today's walking goal"
dogs.list.acrossPack = "{{km}} / {{goal}} km across your pack"
dogs.list.streak = "🔥 {{days}}d"
dogs.list.todayStats = "{{km}} km today · {{count}} walks"
dogs.list.addCta = "+ Add"
dogs.detail.walks = "Walks"
dogs.detail.seeAll = "See all"
dogs.detail.streakLabel = "Streak"
dogs.detail.streakDays = "{{days}}d"
walk.date.today = "Today"
walk.date.yesterday = "Yesterday"
```

## Accessibility

- RingProgress に `accessibilityRole="progressbar"` と `accessibilityValue={{ now, min: 0, max: 100 }}`
- Walks 行は `accessibilityRole="button"` + ラベルに日付と距離を含める
- Edit ボタンは `hitSlop={12}`
- streak バッジは装飾として親ラベルに含める

## Verification

1. `docker compose run --rm mobile npm test -- --testPathPattern='(pack-progress|walk-format|DogListItem|DogWalkRow)'` で新規ユニットテストが通る
2. `docker compose run --rm mobile npm run lint` クリア
3. `docker compose run --rm mobile npx tsc --noEmit` クリア
4. iOS Simulator で手動確認（subagent に委譲せず直接 Bash で `npx expo start` → シミュレータ起動）
   - Dogs タブ: タイトル「Dogs」+ 右上「+ Add」、円形進捗付き Today カード、行に 🔥 streak + today km 表示
   - Dog を選択: hero がフルブリード写真、下端が背景へ fade、name + breed/age、stats に Streak
   - Walks セクションに直近件、日付・距離・時間・ペース・💧💩、行タップで `/walks/[id]` へ遷移
   - 下に Members/Friends 行と Edit/Delete が残っている
   - ナビバー右の Edit で edit 画面へ
5. walks が 0 件の dog で空表示（EmptyState の簡易版）を確認
6. ダークモード切替で hero fade の色が `theme.background` に追従することを確認

## Out of scope

- サーバー側にゴール・streak・weight を持たせる変更
- Walks 履歴画面（`See all` 先）の新規作成 — まずはリンクのみ、Phase 2
- 日本語翻訳 — en キー先行、ja は別 PR
- デザイン仕様にない編集機能刷新
