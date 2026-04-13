# HOME タブを WALK タブに統合する

## Context

現在のモバイルアプリには HOME と WALK の 2 つのタブが存在し、両方とも散歩に関する機能を提供している。

- **HOME** (`apps/mobile/app/(tabs)/index.tsx`): 「Ready for the morning run?」ヒーロー + Start Walk ボタン + RECENT WALKS リスト
- **WALK** (`apps/mobile/app/(tabs)/walk.tsx`): 犬選択（DogSelector） → 散歩記録（WalkMap/Controls） → 完了表示（WalkSummaryCard）の状態機械

両タブとも散歩ドメインに属するため、HOME を廃止して WALK に機能を集約する。結果としてタブ数が 4 → 3 に減り、散歩機能への導線が 1 つに統一される。

## 最終状態

- タブバー: **WALK** → DOGS → SETTINGS（WALK が先頭・デフォルト、アイコンは `figure.walk` を維持）
- WALK タブの `ready` フェーズは HOME と同じ見た目（ヒーロー + Start Walk + RECENT WALKS）
- **Start Walk** ボタンをタップするとボトムシート（Modal）がスライドアップし、犬を選択 → 「Start」で散歩開始
- `recording` / `finished` フェーズは現状維持

## 変更ファイル一覧

### 削除

| ファイル | 理由 |
|---|---|
| `apps/mobile/app/(tabs)/index.tsx` | HOME タブ画面本体を削除 |
| `apps/mobile/__tests__/app/tabs/index.test.tsx` | HOME テストを削除 |

### 追加

| ファイル | 内容 |
|---|---|
| `apps/mobile/components/walk/WalkReadyView.tsx` | HOME の UI（ヒーロー + CTA + RECENT WALKS）を担う新コンポーネント。props: `onStartPress: () => void` |
| `apps/mobile/components/walk/DogSelectorSheet.tsx` | 既存 `DogSelector` をラップする RN `Modal`（`animationType="slide"`, `presentationStyle="pageSheet"`）のボトムシート。props: `visible`, `onClose`, `onStart`, `isStarting` |
| `apps/mobile/components/walk/WalkReadyView.test.tsx` | ヒーロー・CTA・履歴表示・`onStartPress` 呼び出しのテスト |
| `apps/mobile/components/walk/DogSelectorSheet.test.tsx` | 表示/非表示、キャンセル、Start 呼び出しのテスト |

### 変更

| ファイル | 変更内容 |
|---|---|
| `apps/mobile/app/(tabs)/_layout.tsx` | `<Tabs.Screen name="index">` を削除。`<Tabs>` に `initialRouteName="walk"` を追加。`walk` を先頭の `<Tabs.Screen>` として並べる |
| `apps/mobile/app/(tabs)/walk.tsx` | `ready` フェーズで `DogSelector` の直接描画をやめ、`WalkReadyView` + `DogSelectorSheet` を使う。`isSheetOpen` ローカル state を追加。Start Walk → シートを開く、シート内で犬選択確定 → 既存 `handleStart` を実行 |
| `apps/mobile/components/walk/DogSelector.tsx` | フル画面用 padding を調整して、シート内でも自然に表示されるようにする（破壊的変更なし、props 不変） |
| `apps/mobile/lib/i18n/locales/en.json` / `ja.json` | `walk.home.hero` / `walk.home.startWalk` キーは `WalkReadyView` で引き続き使用するため**削除しない**。リネームは後続 PR で検討 |

### 変更不要

| ファイル | 理由 |
|---|---|
| `apps/mobile/app/_layout.tsx` | `router.replace('/(tabs)')` は `initialRouteName="walk"` により walk に解決されるため修正不要 |
| `apps/mobile/stores/walk-store.ts` | フェーズ管理はそのまま |
| `apps/mobile/hooks/use-walks.ts` | `useMyWalks` を `WalkReadyView` で再利用 |
| `apps/mobile/components/walk/WalkHistoryItem.tsx` | 変更なし |

## 設計の要点

### 1. タブ順序とデフォルトルート
Expo Router の `<Tabs>` は `initialRouteName` で最初に表示されるタブを指定する。`<Tabs.Screen>` の JSX 並びでタブバー順序が決まる。`index.tsx` を削除しても `router.replace('/(tabs)')` は `initialRouteName="walk"` により `walk` に解決される。リスクヘッジとして実機確認で必ずチェックし、万一解決されない場合は `/(tabs)/walk` に明示する。

### 2. ボトムシート実装方針
`@gorhom/bottom-sheet` は未導入。依存追加を避けるため、React Native 組み込みの `Modal` を `animationType="slide"` + iOS では `presentationStyle="pageSheet"` でボトムシート風に使う。内部で既存 `DogSelector` を再利用し、ヘッダーに「キャンセル」ボタン、本体に DogSelector（Start ボタン含む）を配置する。

### 3. DogSelector の再利用
`DogSelector` は既に `onStart` / `isStarting` を受け取る設計なので、props API は変更しない。Modal 内でも使えるよう、コンテナの `padding` のみ調整する。これで `DogSelectorSheet` が薄いラッパーで済む。

### 4. ready 状態の挙動
- `phase === 'ready'` → `WalkReadyView` をフル画面表示。`DogSelectorSheet` は `visible={isSheetOpen}` で重ねる
- Start Walk タップ → `setIsSheetOpen(true)`
- シート内で犬選択 → Start ボタンタップ → 既存 `handleStart` 実行 → `phase` が `recording` に遷移 → `useEffect` で `isSheetOpen=false` にリセット（またはシート自体が phase 分岐で消える）
- キャンセルボタン → `setIsSheetOpen(false)` のみ

### 5. 再利用するコード
- `useMyWalks()` (`apps/mobile/hooks/use-walks.ts`)
- `WalkHistoryItem` (`apps/mobile/components/walk/WalkHistoryItem.tsx`)
- `DogSelector` (`apps/mobile/components/walk/DogSelector.tsx`)
- `useWalkStore` / `useStartWalk` などの既存 hooks

## 実装手順 (TDD)

1. **赤**: `WalkReadyView.test.tsx` を書く（ヒーロー文言・Start ボタン・履歴表示・空状態・`onStartPress` 呼び出し）
2. **緑**: `WalkReadyView.tsx` を実装（既存 `index.tsx` の JSX を参考）
3. **赤**: `DogSelectorSheet.test.tsx` を書く（`visible=false` で非表示・キャンセルボタンで `onClose` 呼び出し・内部の DogSelector が `onStart` を発火）
4. **緑**: `DogSelectorSheet.tsx` を実装
5. `walk.tsx` を差し替え（`ready` フェーズで `WalkReadyView` + `DogSelectorSheet` を使う、`isSheetOpen` state 追加、phase 変化時のシート自動クローズ）
6. `_layout.tsx` から `index` Screen を削除、`initialRouteName="walk"` を追加、Screen の並び順を walk 先頭に
7. `index.tsx` と `__tests__/app/tabs/index.test.tsx` を削除
8. `DogSelector.tsx` の padding 調整（必要なら）
9. 自動テスト全実行・型チェック
10. iOS Simulator で手動検証（わたしが ios-sim-test スキル経由で実施）

## 検証方法

### 自動検証（わたしが実施）

```bash
# テスト
docker compose -f apps/mobile/docker-compose.yml run --rm mobile npm test -- --ci

# 型チェック
docker compose -f apps/mobile/docker-compose.yml run --rm mobile npx tsc --noEmit
```

期待: 新規テストが pass、既存テスト（`WalkHistoryItem.test.tsx`, `DogSelector.test.tsx`, `walk-store.test.ts` 他）に regression なし、`index.test.tsx` は存在しないため skip、型エラーなし。

### iOS Simulator 検証（わたしが `ios-sim-test` スキルで実施）

セットアップ:
```bash
export PATH="/tmp/idb-venv/bin:$PATH"
export PY=/opt/homebrew/bin/python3.13
export SCRIPTS=/Users/matsuokashuhei/Development/walking-dog/.claude/skills/ios-simulator-skill/scripts
export UDID=$(xcrun simctl list devices booted -j | jq -r '.devices[][] | select(.state == "Booted") | .udid' | head -1)
```

検証ステップ:
1. `docker compose -f apps/compose.yml up -d` でバックエンド起動
2. `npx expo start --port 8081 &` で Metro 起動
3. `$PY $SCRIPTS/app_launcher.py --launch com.walkingdog.dev`
4. `$PY $SCRIPTS/screen_mapper.py` でタブが **WALK / DOGS / SETTINGS** の 3 つで、WALK が初期選択になっていることを確認
5. `$PY $SCRIPTS/screen_mapper.py` で「Ready for the morning run?」ヒーローと Start Walk ボタン・RECENT WALKS 行が存在することを確認
6. `xcrun simctl io $UDID screenshot /tmp/walk-ready.png` で視覚確認
7. `$PY $SCRIPTS/navigator.py --find-text "Start Walk" --tap` でシートを開く
8. `$PY $SCRIPTS/screen_mapper.py` でシート内に犬のリストと Start ボタンがあることを確認
9. `xcrun simctl io $UDID screenshot /tmp/walk-sheet.png` で視覚確認
10. `$PY $SCRIPTS/privacy_manager.py --bundle-id com.walkingdog.dev --grant location-always` で位置情報許可を付与
11. `$PY $SCRIPTS/navigator.py --find-text "Shiba" --tap` で犬を選択、`$PY $SCRIPTS/navigator.py --find-text "Start Walk" --find-type Button --tap` で開始
12. `$PY $SCRIPTS/screen_mapper.py` で地図・タイマー・Finish ボタンが表示されていることを確認
13. Finish → `screen_mapper.py` で「Walk Complete!」表示を確認
14. Walk Again → ready 状態に戻ることを確認
15. RECENT WALKS 行をタップ → 詳細画面への遷移を確認（既存挙動）
16. クリーンアップ: Metro kill、Simulator shutdown、docker compose down

### 手動検証（ユーザーに依頼する部分）

- ダークモード切替時のレイアウト崩れ
- Android 実機/エミュでの挙動（Modal の見た目は iOS と異なる）
- 本番ビルドでの初回起動時のタブ解決

## 注意点 / リスク

- `router.replace('/(tabs)')` の解決先: `initialRouteName` が効かない場合は `/(tabs)/walk` に変更
- iOS の `Modal presentationStyle="pageSheet"` は iOS 13+ 必須
- Android では `presentationStyle` が無視され、フルスクリーン slide になる点を受容する
- Deep Link で `/(tabs)/` を踏む箇所は `app/_layout.tsx` の 2 箇所のみ（grep 済み）

## i18n キー（変更なし）

- `walk.home.hero` / `walk.home.startWalk`: `WalkReadyView` で継続利用
- `walk.history.title` / `walk.history.empty`: RECENT WALKS セクションで継続利用
- `walk.ready.*`: シート内 `DogSelector` で継続利用
