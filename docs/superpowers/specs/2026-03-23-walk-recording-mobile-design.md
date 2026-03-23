# 散歩記録（Increment 5）— モバイル再設計

**Status:** Approved (2026-03-23)
**Scope:** モバイル側のみ再設計。API側は既存実装を維持。

## Context

PR #23 の前回実装は Docker + Expo Go 環境で `react-native-maps` と `expo-sqlite` の Web bundler 互換性問題によりブロックされた。今回はモバイル開発を `npx expo run:ios`（ローカルネイティブビルド + iOS Simulator）に切り替え、モバイル側を再設計する。

## Decisions

| 項目 | 決定 |
|------|------|
| ビルド方式 | `npx expo run:ios`（ローカルネイティブビルド） |
| アーキテクチャ | シンプル直接送信（SQLiteオフラインバッファなし） |
| 状態管理 | Zustand store with 3 phases: `ready` → `recording` → `finished` |
| 距離計算 | モバイル側でリアルタイム Haversine 計算 |
| 散歩履歴 | ホームタブに表示 |
| スコープ | 基本機能のみ（GPS記録・開始/停止・犬選択・マップ表示・履歴一覧・詳細画面） |

## Architecture

### Data Flow

```
expo-location (5秒間隔)
    ↓ position event
walk-store (Zustand)
    ├── points: WalkPoint[]
    ├── totalDistanceM: number (Haversine累積)
    └── elapsedSec: number (Date.now() - startedAt で計算)
    ↓ subscribe
    ├── WalkMap (react-native-maps + Polyline)
    └── WalkControls (timer + distance)
    ↓ finishWalk()
API Calls (GraphQL)
    1. startWalk(dogIds) → walk.id
    2. finishWalk(walkId) → walk summary
    3. addWalkPoints(walkId, points[]) → boolean
    ↓
    ├── PostgreSQL (walks, walk_dogs)
    └── DynamoDB (WalkPoints)
```

### Walk Store

```typescript
type WalkPhase = 'ready' | 'recording' | 'finished';

interface WalkState {
  phase: WalkPhase;
  walkId: string | null;
  selectedDogIds: string[];
  points: WalkPoint[];
  totalDistanceM: number;
  startedAt: Date | null;
  elapsedSec: number;

  selectDog(dogId: string): void;
  startRecording(walkId: string): void;
  addPoint(point: WalkPoint): void;
  finish(): void;
  reset(): void;
}
```

### GPS Tracker

```typescript
// lib/walk/gps-tracker.ts
export function startTracking(
  onPosition: (point: WalkPoint) => void
): () => void;
// expo-location watchPositionAsync wrapper
// 5秒間隔, accuracy: High
// 返り値: stopTracking cleanup function
```

**位置情報パーミッション:**
- 散歩開始前に `requestForegroundPermissionsAsync()` を呼ぶ
- 拒否された場合: 説明画面を表示し、設定アプリへのリンクを提供
- `gps-tracker.ts` 内でパーミッションチェックを行い、未許可なら Error を throw

### Distance Calculation

```typescript
// lib/walk/distance.ts
export function haversineDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number; // meters
```

### API Hooks

```typescript
// hooks/use-walk-mutations.ts
export function useStartWalk(): UseMutationResult;
export function useFinishWalk(): UseMutationResult;
export function useAddWalkPoints(): UseMutationResult;

// hooks/use-walks.ts
export function useWalk(id: string): UseQueryResult;
export function useMyWalks(): UseQueryResult;
```

既存の `lib/graphql/mutations.ts` と `lib/graphql/queries.ts` に定義済みの GraphQL を使用。

## UI Design

### Screen Flow

```
ready → (開始ボタン) → recording → (停止ボタン) → finished → (リセット) → ready
```

### Walk Screen (`app/(tabs)/walk.tsx`)

Phase に応じて3つのコンポーネントを切替:

```typescript
const { phase } = useWalkStore();
if (phase === 'ready')     return <DogSelector />;
if (phase === 'recording') return <WalkRecording />;  // WalkMap + WalkControls
if (phase === 'finished')  return <WalkFinished />;   // WalkSummaryCard + buttons
```

**コンポーネント構成:**
- `WalkRecording` = `WalkMap` + `WalkControls`（recording phase のコンテナ）
- `WalkFinished` = `WalkSummaryCard` + 「詳細を見る」「もう一度散歩」ボタン

### Components

| Component | Location | Role |
|-----------|----------|------|
| `DogSelector` | `components/walk/DogSelector.tsx` | 犬リスト、複数選択、開始ボタン |
| `WalkMap` | `components/walk/WalkMap.tsx` | react-native-maps + Polyline ルート表示 |
| `WalkControls` | `components/walk/WalkControls.tsx` | タイマー、距離表示、停止ボタン |
| `WalkSummaryCard` | `components/walk/WalkSummaryCard.tsx` | 完了時サマリー |
| `WalkHistoryList` | `components/walk/WalkHistoryList.tsx` | ホーム画面の散歩リスト |

### Modified Screens

| Screen | Change |
|--------|--------|
| `app/(tabs)/walk.tsx` | 3-state UI 実装 |
| `app/(tabs)/index.tsx` | WalkHistoryList 追加 |
| `app/walks/[id].tsx` | 散歩詳細画面実装 |
| `lib/graphql/keys.ts` | walkKeys 追加 |

## Error Handling

| シナリオ | 対応 |
|----------|------|
| `startWalk` 失敗 | Alert表示、ready phase に留まる |
| `finishWalk` 失敗 | Alert表示 + リトライボタン。ポイントはメモリに保持 |
| `addWalkPoints` 失敗 | 失敗をログ。ポイントはメモリに残るので次回finishWalk時に再送信 |
| 位置情報パーミッション拒否 | 説明画面 + 設定アプリへのリンク |

**注意:** オフラインバッファなしのため、アプリがクラッシュした場合は未送信ポイントが失われる。MVP では許容する。

## Walk Point Sending Strategy

- 散歩中はポイントをメモリ（Zustand store）に蓄積
- `finishWalk()` 呼出し後に `addWalkPoints()` で全ポイントをまとめて送信
- API の `addWalkPoints` は最大200ポイント/バッチなので、200超の場合は分割送信

## Elapsed Time

- `elapsedSec` は `Date.now() - startedAt` で計算（1秒interval のカウンター方式は使わない）
- アプリがバックグラウンドに回っても正確な経過時間を表示できる
- 表示更新用に1秒ごとの `setInterval` を `WalkControls` コンポーネント内で実行

## Query Keys

```typescript
// lib/graphql/keys.ts に追加
export const walkKeys = {
  all: ['walks'] as const,
  detail: (id: string) => ['walks', id] as const,
  list: () => ['walks', 'list'] as const,
};
```

## Pagination

- `WalkHistoryList` は最新20件を表示
- MVP では無限スクロールは実装しない（`myWalks` API は limit/offset 対応済み）

## API (Existing — No Changes)

以下は既に実装済み。変更不要:

- `startWalk(dogIds: [ID!]!)` → Walk
- `finishWalk(walkId: ID!)` → Walk
- `addWalkPoints(walkId: ID!, points: [WalkPointInput!]!)` → Boolean
- `walk(id: ID!)` → Walk
- `myWalks` → [Walk]
- `walkPoints(walkId: ID!)` → [WalkPoint]

## Out of Scope

- SQLite オフラインバッファ
- バックグラウンド GPS 追跡
- 統計ダッシュボード（dogWalkStats は API に既存だが UI は後回し）
- 散歩中の一時停止/再開
