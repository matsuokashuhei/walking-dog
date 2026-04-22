# Walk Finished Screen — Precise Redesign

## Context

現状の終了画面 (`apps/mobile/components/walk/WalkSummaryCard.tsx`) は「WALK COMPLETE ヘッダ → dot 付きメトリクスリスト → イベントチップ行 → Add note / Save walk ボタン」という抽象的な構造で、犬の識別・ルート可視化・犬ごとの活動量の可視化が欠けている。

ユーザーは添付モックアップ（複数頭 Coco + Momo のケース）のように、**静的ルートマップ + 3 つの表示専用メトリクスピル + 犬ごとのサマリ**を中心に据えたレイアウトに差し替えたい。単頭時は「Per dog」カードと「Saved to both…」ノートを省く分岐が必要。

目的：
- 飼い主に「今日の散歩の成果」を即座に伝える（距離・時間・ペース・犬ごとのイベント件数）
- 共同散歩を可視化する（「together」感、犬ごとの内訳）
- Precise UI 言語（大見出し・丸みカード・重畳ピル）を終了画面に適用する

## Target Layout

```
WALK COMPLETE  (green caption)
Nice walk, everyone.         (large title, 2行想定)
🐶🐶 Coco and Momo · 24 min together

┌ static map card ─────────────┐
│      ╭─●  (end, red)         │
│    ╭─╯                        │
│ ●──╯     (start, green)       │
│ [1.42 km] [24:18] [4'18"/km]  │  ← 左下重畳の 3 ピル
└───────────────────────────────┘

Per dog                 View each
┌ grouped card ─────────────┐
│ 🐶 Coco  💧2 · 💩1 · 📷3  >│
│ ─────                      │
│ 🐶 Momo  💧1 · 💩0 · 📷1  >│
└────────────────────────────┘

Saved to both Coco's and Momo's history   (center, muted)

[ Add note ]   [ Save walk ]

Dogs  Walk  Me   (既存タブバー — recording で消して finished で復帰済み)
```

## Files

### 新規
- `apps/mobile/components/walk/WalkRoutePreview.tsx`
- `apps/mobile/components/walk/PerDogSummaryCard.tsx`
- `apps/mobile/components/walk/WalkRoutePreview.test.tsx`
- `apps/mobile/components/walk/PerDogSummaryCard.test.tsx`

### 変更
- `apps/mobile/components/walk/WalkSummaryCard.tsx` — 上記 2 つを組み合わせた新構成に書き直し、単頭/多頭分岐
- `apps/mobile/components/walk/WalkSummaryCard.test.tsx` — 構造変更に合わせて書き直し
- `apps/mobile/lib/walk/format.ts` — `formatPace(elapsedSec, totalM)` と `formatPaceString(...)` を追加し共通化
- `apps/mobile/components/walk/WalkControls.tsx` — 既存 `formatPace` を `format.ts` 経由に置換（動作変更なし）
- `apps/mobile/lib/i18n/locales/en.json` / `ja.json` — 新規キー追加

### 変更なし
- `apps/mobile/stores/walk-store.ts` — `finish()` は `points / events / startedAt / totalDistanceM / selectedDogIds` を既に保持しているため変更不要
- `apps/mobile/app/(tabs)/walk.tsx` — `phase === 'finished'` 時のタブバー復帰は実装済み
- `apps/mobile/types/graphql.ts` — 既存 `Dog` / `WalkEvent` で足りる

## 実装詳細

### 1. `WalkRoutePreview.tsx`

Props:
```ts
interface WalkRoutePreviewProps {
  points: WalkPoint[];
  totalDistanceM: number;
  elapsedSec: number;
}
```

- `react-native-maps` の `<MapView>` + `<Polyline>`（`walk-store.points` を `{ latitude, longitude }` にマップ）
- マップのインタラクション全停止: `scrollEnabled=false` / `zoomEnabled=false` / `pitchEnabled=false` / `rotateEnabled=false` / `toolbarEnabled=false`
- `<Marker>` × 2: start は `points[0]` に `theme.success` の小さな円、end は `points.at(-1)` に `theme.error` の小さな円
- `initialRegion` は start/end の平均から（`latDelta = longDelta = 0.01` で仮決め。ズーム崩れたら `use-walk-detail-view-model.ts` の midpoint 計算を流用）
- カードは `borderRadius: radius.xl`、`overflow: 'hidden'`、高さ約 180pt
- **メトリクスピル 3 つ** を `position: 'absolute'` で左下に重畳:
  - 親: `{ position: 'absolute', bottom: spacing.sm, left: spacing.sm, flexDirection: 'row', gap: spacing.xs }`
  - 各ピル: `backgroundColor: theme.surface`, `borderRadius: radius.full`, `paddingVertical: 4`, `paddingHorizontal: spacing.sm`, `elevation.low`
  - 中身: `formatDistance(totalDistanceM)` / `formatTime(elapsedSec)` / `formatPaceString(elapsedSec, totalDistanceM)`
- **`points.length < 2` の時**: Polyline / Marker はスキップ、ピルはそのまま描画
- `accessibilityElementsHidden={true}` で読み上げから除外（メトリクスはヒーロー上でも触れる）

### 2. `PerDogSummaryCard.tsx`

Props:
```ts
interface PerDogSummaryCardProps {
  dogs: Dog[];
  events: WalkEvent[];
  onViewEach?: () => void;
}
```

- 外側: ヘッダ行（カード外）
  - 左: `<Text>` に `t('walk.finished.perDog')` ("Per dog")
  - 右: `<Pressable>` に `t('walk.finished.viewEach')` ("View each")、`color: theme.primary`
- 内側カード (`GroupedCard`):
  - 各犬の行:
    - 左: アバター (`expo-image` w/h=32, `borderRadius: 16`, fallback to `@/assets/images/icon.png`)
    - 中: `styles.name` に犬名
    - 右中: `💧N · 💩N · 📷N` を small caption 色
    - 右端: chevron `›` (Text で `›` 描画 or `react-native-vector-icons` が既に入っていればそれを使用)
  - 行の高さは `~56pt`、行間 divider (`hairlineWidth`, `theme.border`)
- 件数集計: ローカルに `function countFor(dogId: string, events: WalkEvent[]): { pee; poo; photo }` を置く
- 呼び出し側から `dogs.length <= 1` の場合は**呼ばない**

### 3. `WalkSummaryCard.tsx` 書き直し

```ts
export function WalkSummaryCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useColors();
  const insets = useSafeAreaInsets();

  const walkId = useWalkStore((s) => s.walkId);
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const points = useWalkStore((s) => s.points);
  const events = useWalkStore((s) => s.events);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const reset = useWalkStore((s) => s.reset);

  const { data: me } = useMe();
  const dogs = useMemo(
    () => (me?.dogs ?? []).filter((d) => selectedDogIds.includes(d.id)),
    [me?.dogs, selectedDogIds],
  );

  const elapsedSec = startedAt
    ? Math.floor((Date.now() - startedAt.getTime()) / 1000)
    : 0;
  const elapsedMin = Math.max(1, Math.round(elapsedSec / 60));

  const isSingle = dogs.length <= 1;
  const title = isSingle
    ? t('walk.finished.titleSingle', { name: dogs[0]?.name ?? '' })
    : t('walk.finished.titleMulti');
  const subtitle = isSingle
    ? t('walk.finished.minSolo', { name: dogs[0]?.name ?? '', min: elapsedMin })
    : t('walk.finished.minTogether', {
        names: joinNames(dogs, t),
        min: elapsedMin,
      });
  const savedNote = isSingle
    ? t('walk.finished.savedToHistorySingle', { name: dogs[0]?.name ?? '' })
    : t('walk.finished.savedToHistoryMulti', {
        a: dogs[0]?.name ?? '',
        b: dogs[1]?.name ?? '',
      });

  const handleSave = () => {
    const id = walkId;
    reset();
    if (id) router.push(`/walks/${id}`);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}>
      {/* Hero */}
      <Text style={[styles.caption, { color: theme.success }]}>
        {t('walk.finished.walkComplete')}
      </Text>
      <Text style={[styles.title, { color: theme.onSurface }]}>{title}</Text>
      <View style={styles.subtitleRow}>
        <AvatarStack dogs={dogs} />
        <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>
          {subtitle}
        </Text>
      </View>

      {/* Route */}
      <WalkRoutePreview
        points={points}
        totalDistanceM={totalDistanceM}
        elapsedSec={elapsedSec}
      />

      {/* Per-dog (multi only) */}
      {!isSingle && (
        <PerDogSummaryCard
          dogs={dogs}
          events={events}
          onViewEach={() => walkId && router.push(`/walks/${walkId}`)}
        />
      )}

      {/* Saved note */}
      <Text style={[styles.savedNote, { color: theme.onSurfaceVariant }]}>
        {savedNote}
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <Button label={t('walk.finished.addNote')} variant="ghost" style={styles.addNote} />
        <Button label={t('walk.finished.saveWalk')} variant="primary" onPress={handleSave} style={styles.save} />
      </View>
    </ScrollView>
  );
}
```

補足:
- `joinNames(dogs, t)` は `'Coco and Momo'`（英）/ `'CocoとMomo'`（日）風の join。単頭は n/a。
- `AvatarStack` はヒーロー直下の小さい重畳アバター（最大 2 匹表示、`WalkControls` の avatars ロジックをそのまま抜き出して reuse 可能）。
- `ScrollView` で縦を許容。下部 `insets.bottom` を取る。

### 4. `formatPace` の共通化

既存 `WalkControls.tsx` L211-217 のローカル `formatPace` を `apps/mobile/lib/walk/format.ts` に移設し:

```ts
export function formatPace(elapsedSec: number, totalM: number): { value: string; unit: string } {
  if (totalM < 100 || elapsedSec === 0) return { value: '—', unit: '/km' };
  const secPerKm = (elapsedSec / totalM) * 1000;
  const mm = Math.floor(secPerKm / 60);
  const ss = Math.floor(secPerKm % 60);
  return { value: `${mm}'${ss.toString().padStart(2, '0')}"`, unit: '/km' };
}

export function formatPaceString(elapsedSec: number, totalM: number): string {
  const { value, unit } = formatPace(elapsedSec, totalM);
  return `${value}${unit}`;
}
```

`WalkControls.tsx` は `import { formatPace } from '@/lib/walk/format'` に置き換え、既存ローカル関数を削除。

### 5. i18n 追加キー (`walk.finished.*`)

en.json:
```json
"walk.finished.walkComplete": "WALK COMPLETE",
"walk.finished.titleSingle": "Nice walk, {{name}}!",
"walk.finished.titleMulti": "Nice walk, everyone.",
"walk.finished.perDog": "Per dog",
"walk.finished.viewEach": "View each",
"walk.finished.minTogether": "{{names}} · {{min}} min together",
"walk.finished.minSolo": "{{name}} · {{min}} min",
"walk.finished.savedToHistoryMulti": "Saved to both {{a}}'s and {{b}}'s history",
"walk.finished.savedToHistorySingle": "Saved to {{name}}'s history",
"walk.finished.addNote": "Add note",
"walk.finished.saveWalk": "Save walk",
"walk.finished.joiner.and": "and"
```

ja.json は対訳。既存 `walk.finished.title / details / done / saving` は他箇所で参照されている可能性があるため**残す**（Grep で参照なしなら削除）。

## Testing

### 1. `WalkRoutePreview.test.tsx`
- `react-native-maps` を `jest.mock`（`{ __esModule: true, default: 'MapView', Polyline: 'Polyline', Marker: 'Marker' }`）
- `points.length >= 2` のとき Polyline / start Marker / end Marker が存在
- 3 つのピルが `1.42 km` / `24:18` / `4'18"/km` を含むテキストで表示
- `points.length < 2` のとき Polyline なしでもピルは表示

### 2. `PerDogSummaryCard.test.tsx`
- 2 匹渡すと 2 行表示、犬名が出る
- `💧N · 💩N · 📷N` が表示（`eventsFor` ロジックの検証）
- `View each` 押下で `onViewEach` が呼ばれる
- イベント 0 件でも `💧0 · 💩0 · 📷0` が出る

### 3. `WalkSummaryCard.test.tsx` 改訂
- 多頭ケース: `titleMulti` / `PerDogSummaryCard` 表示 / `savedToHistoryMulti` ノート / `Save walk` → `reset()` + `router.push('/walks/<id>')`
- 単頭ケース: `titleSingle` / `PerDogSummaryCard` 非表示 / `savedToHistorySingle` ノート
- `use-me` のモックで `me.dogs` と `selectedDogIds` から `dogs` を合成
- `walk-store` のモックで `points`, `events`, `startedAt`, `totalDistanceM`, `selectedDogIds` を制御

## 検証

### コマンド
```bash
# typecheck / lint / unit tests
docker compose -f apps/compose.yml run --rm mobile npm run typecheck
docker compose -f apps/compose.yml run --rm mobile npm run lint
docker compose -f apps/compose.yml run --rm mobile npm test -- --watchAll=false
```

### iOS Simulator 目視 (`ios-sim-test`)
1. 犬 1 匹で散歩開始 → 数点 GPS 収集 → End Walk → 終了画面
   - 単頭レイアウト: Per dog なし / `titleSingle` / `savedToHistorySingle`
2. 犬 2 匹以上で散歩開始 → 数点 GPS 収集 → End Walk → 終了画面
   - 多頭レイアウト: Per dog カード / `titleMulti` / `savedToHistoryMulti`
3. マップに Polyline と start/end Marker が描画、3 ピルが左下に重畳、地図操作で反応しない
4. `Save walk` 押下で `/walks/<id>` に遷移、store が `ready` にリセットされることを確認
5. `Add note` は押しても no-op（クラッシュしない）
6. タブバーが終了画面で復帰している

## 非スコープ

- `View each` の専用「犬ごとの詳細」画面の新規作成（現状は `/walks/<id>` への遷移で代替）
- `Add note` の実装（既存の未実装 ghost ボタンを維持）
- API 変更（今回は UI のみ）
- 時間帯で title 文言を変える（単頭/多頭の 2 分岐のみ）
- Walk summary の永続化や楽観的更新（既存 `handleSave` のまま）
