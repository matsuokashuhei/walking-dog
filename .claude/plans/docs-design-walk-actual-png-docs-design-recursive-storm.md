# Precise Walk Ready — spec 準拠リデザイン

## Context

`docs/design/walk/walk-1.png` / `walk-1.html` の Precise 仕様に対し、現状の
Walk 画面 (`app/(tabs)/walk.tsx` の `phase === 'ready'`) は以下がズレている。

- **大見出し "Walk" が無い**（現状は START が最上段）
- **犬選択 UI がモーダルシート（`DogSelectorSheet`）に隠れている** — 仕様では画面本体にグループ化カードで常時表示
- **START までの導線**：現状は「START → モーダル → 犬選択 → Start Walk」の 2 ステップ。仕様は「犬選択 → START」の 1 画面
- **Group walk サマリカード（複数選択時）が無い**
- **補助テキスト**：現状 "Tap to begin. We'll follow your route." / 仕様 "We'll log pees, poops and photos for each dog separately."
- **RECENT WALKS 履歴リスト** — 仕様外。Walk タブからは削除する（ユーザー確認済み）

Walk 画面の主役を「これから誰と散歩するかを選ぶ準備台」に戻すことで、
*犬の体験*（個別ログ）・*データによる散歩の最大化*（頭数に応じた分離記録の
意図が UI で可視化）・*飼い主の貢献心*（1タップで散歩開始）の3軸を満たす。

この PR は Precise redesign シリーズの次エピソード (Walk ready)。直前の
Dogs list / Dog detail / Auth / Sign In / Sign Up と同じ粒度で、既存の
`GroupedCard` / `SectionHeader` / `Tag` / `Button` プリミティブを再利用する。

タブアイコンは SF Symbols のまま（ユーザー確認済み・スコープ外）。

---

## Scope

### 画面として残す / 変える / 捨てる

| 要素 | 処置 |
|---|---|
| largeTitle "Walk" | **新規**。左寄せ 34pt/700、`letterSpacing: -0.6` |
| "WHO'S COMING?" セクション + "Select all" アクション | **新規** |
| 犬選択カード（GroupedCard + 行） | **新規**。`DogSelectorSheet` / 旧 `DogSelector` を置き換え |
| Group walk サマリカード | **新規**。選択が 2 頭以上で表示 |
| START 円形ボタン (200×200) | **再利用**。配置だけ中段へ移す |
| 補助テキスト | **文言差し替え**（i18n キー追加） |
| RECENT WALKS セクション + 履歴リスト | **削除** |
| モーダル経由の Cancel / Start Walk | **削除**（インライン化で不要） |

### ユーザー確認済みの前提

1. 履歴リストは Walk タブから完全に削除（将来 Me タブで再利用する選択肢は残す）
2. タブバーアイコンは SF Symbols のまま（Precise SVG 差し替えは別 PR）

---

## 実装手順（TDD: RED → GREEN → REFACTOR）

### 1. UI プリミティブ拡張

**`apps/mobile/components/ui/SectionHeader.tsx`**
- `trailing?: ReactNode` を追加。存在すれば `flexDirection: 'row'` /
  `justifyContent: 'space-between'` で右端に配置
- 既存の呼び出し側は破壊しない（trailing 省略時の見た目を現状維持）
- テスト: trailing なしで従来表示、trailing ありで trailing が描画されるか

### 2. 犬選択カード

**新規 `apps/mobile/components/walk/DogPickerCard.tsx`**
- `GroupedCard` を surface に採用
- 行 = `Pressable` (accessibilityRole="checkbox" / accessibilityState.checked)
  - 左 44×44 `expo-image` アバター（photoUrl / placeholder）
  - 中央 `name` (16/600) + `breedSubtitle` (12pt, 60% onSurface)
  - 右 26×26 チェック：選択時は `backgroundColor: theme.interactive` の丸 + 白 `✓`、
    未選択は `borderWidth: 1.5` / `borderColor: onSurfaceVariant 30%` の空リング
  - 行間は `height: StyleSheet.hairlineWidth` セパレータ、`marginLeft: 72`
- props: `dogs: Dog[]`, `selectedIds: string[]`, `onToggle(id)`
- **サブタイトル文言**: 仕様では "Toy Poodle · last walk 2h ago"。`Dog` 型に
  `lastWalkAt` が無い場合は犬種のみ表示。将来 `lastWalkAt` 追加時に相対時刻
  表示できるよう `buildSubtitle(dog)` ヘルパーを関数外に切り出す
- テスト: 未選択/選択の切替、アクセシビリティ state、犬種のみ/ありの分岐

**新規 `apps/mobile/components/walk/GroupWalkSummaryCard.tsx`**
- 選択が 2 頭以上のときだけ描画
- 左: 36×36 アバターを `marginLeft: -10` で 2 枚重ね（最大 3 枚まで、残りは数字バッジ）
- 中央: "{count} dogs walking together"。count を bold テキストで前置し、
  続く "dogs walking together" は通常ウェイト。`<Text>` 内の `<Text>` で
  スタイル分岐（`fontWeight: '700'`）
- 右: `<Tag tone="success" label={t('walk.ready.groupWalk')} />`
- テスト: 1 頭 → 非描画、2 頭 → 2 avatar + count 2、3 頭 → avatar 3 + count 3

### 3. WalkReadyView 刷新

**`apps/mobile/components/walk/WalkReadyView.tsx`** を全面書き換え
- 構造 (上から):
  1. largeTitle "Walk" — `paddingHorizontal: spacing.lg` / `paddingTop: spacing.md`
  2. `SectionHeader` `label={t('walk.ready.whosComing')}` + trailing に
     "Select all" Pressable（`color: theme.interactive`、`textTransform: none`）
  3. `DogPickerCard`（上の新規）
  4. `GroupWalkSummaryCard`（選択 2 頭以上のみ）
  5. 中央 `Button size="circle" variant="success" label="START"`
     - disabled: `selectedDogIds.length === 0 || isStarting`
     - onPress は `onStart` prop → 親 `app/(tabs)/walk.tsx` の `handleStart` を直接呼ぶ
  6. 補助テキスト `t('walk.ready.hint')` — `footnote` / 60% / `textAlign: 'center'` / `maxWidth: 300`
- `FlatList` は使わず `ScrollView`（犬数は通常 1〜数頭で列挙で十分）。履歴は描画しない
- dogs が 0 のときは選択カード枠内に `noDogs` 空状態メッセージ + 登録導線（既存文言再利用）
- `Select all` は `dogs.every(d => selected)` ならトグルで全解除、そうでなければ全選択

**`apps/mobile/app/(tabs)/walk.tsx`**
- `DogSelectorSheet` 周りと `isSheetOpen` state を削除
- `<WalkReadyView onStart={handleStart} isStarting={walkSession.isStarting} />` に変更
- `handleStart` 呼び出しタイミングは現状維持（GPS / BLE 権限フロー / Live Activity）
- `phase !== 'ready'` の分岐は**触らない**（recording / finished は別画面）

### 4. 削除するコード

- `apps/mobile/components/walk/DogSelectorSheet.tsx` 本体と test（存在すれば）
- `apps/mobile/components/walk/DogSelector.tsx` 本体と test（旧モーダル内 UI）
- `WalkReadyView.tsx` 内の `useMyWalks` import と履歴描画ロジック
- `components/walk/WalkHistoryItem.*` / `hooks/use-walks.ts` は**削除しない**
  （将来 Me タブ等で再利用する余地を残す。未使用 import のみ除去）
- 参照が他に無いことを `grep -r "DogSelectorSheet\|DogSelector[^P]"` で確認

### 5. i18n

`apps/mobile/lib/i18n/locales/en.json` / `ja.json` に追加：

```
walk.ready.largeTitle      "Walk" / "散歩"
walk.ready.whosComing      "Who's coming?" / "今日の散歩メンバー"
walk.ready.selectAll       "Select all" / "すべて選択"
walk.ready.dogsWalkingBold "{{count}} dogs" / "{{count}} 頭"
walk.ready.dogsWalkingTail "walking together" / "でおでかけ"
walk.ready.groupWalk       "Group walk" / "グループ散歩"
walk.ready.hint            "We'll log pees, poops and photos for each dog
                           separately." / "おしっこ・うんち・写真は犬ごと
                           に記録されます"
```

既存の `walk.ready.title` / `walk.ready.subtitle` / `walk.ready.start` /
`walk.home.hero` / `walk.history.*` は、他から参照されていなければ削除。
`grep -r "walk\.home\.hero\|walk\.history\."` で確認してから消す。

### 6. テスト

- `DogPickerCard.test.tsx` — RNTL、queryByRole("checkbox") で state 検証
- `GroupWalkSummaryCard.test.tsx` — 1/2/3 頭の分岐、Tag 表示、avatar 枚数
- `WalkReadyView.test.tsx` — (a) "Walk" 見出し、(b) START が disabled when no dog,
  (c) "Select all" で全選択、(d) 選択 0→1→2 で GroupWalkSummaryCard が現れる、
  (e) 履歴関連 DOM が存在しないこと
- `SectionHeader.test.tsx` — trailing prop（既存テストがあれば拡張）
- `walk.tsx` は integration で `useWalkSession` をモックし、START 押下で
  `permissions.requestGpsPermission` / `walkSession.start` が呼ばれるか確認

---

## Critical Files

**変更**
- `apps/mobile/app/(tabs)/walk.tsx` — sheet 排除
- `apps/mobile/components/walk/WalkReadyView.tsx` — 全面書き換え
- `apps/mobile/components/ui/SectionHeader.tsx` — trailing prop
- `apps/mobile/lib/i18n/locales/en.json` / `ja.json`

**新規**
- `apps/mobile/components/walk/DogPickerCard.tsx`
- `apps/mobile/components/walk/DogPickerCard.test.tsx`
- `apps/mobile/components/walk/GroupWalkSummaryCard.tsx`
- `apps/mobile/components/walk/GroupWalkSummaryCard.test.tsx`

**削除**
- `apps/mobile/components/walk/DogSelectorSheet.tsx` (+test)
- `apps/mobile/components/walk/DogSelector.tsx` (+test)

**再利用（無変更）**
- `apps/mobile/components/ui/GroupedCard.tsx`
- `apps/mobile/components/ui/Tag.tsx` (`tone="success"`)
- `apps/mobile/components/ui/Button.tsx` (`variant="success" size="circle"`)
- `apps/mobile/hooks/use-me.ts` (`me.dogs`)
- `apps/mobile/stores/walk-store.ts` (`selectedDogIds`, `selectDog`)

---

## Verification

**自動**
```
cd apps/mobile
npm run lint
npm run typecheck
npm test -- --watchAll=false
```
- 追加したテストはもちろん、既存テストが回帰していないこと
- `DogSelectorSheet` / `DogSelector` / `walk.history.*` の参照が 0 件

**手動（iOS Simulator）**
```
npm run ios
```
1. Walk タブを開く → largeTitle "Walk" が左上
2. "WHO'S COMING?" の右に "Select all" が表示、タップで全選択トグル
3. 犬行をタップすると青塗りチェック ↔ 空リングが切り替わる
4. 2 頭以上選択 → Group walk カードがアニメーションなしで現れる
5. 選択 0 頭で START ボタンが disabled（`theme.border` 色、opacity）
6. START → GPS 権限ダイアログ → 許可で recording 画面へ遷移
7. recording / finished 画面は一切変更なし（リグレッション確認）
8. 履歴リストが画面のどこにも存在しないこと

**アクセシビリティ**
- VoiceOver でカード行が "Coco, 未選択, ボタン" と読み上げられる
- START disabled 時に announcement で無効が伝わる
- タップターゲット ≥ 44pt（行高さ 60pt / チェック hitSlop 込み）

---

## Out of Scope (明示)

- タブバー SVG の差し替え（SF Symbols のまま維持）
- `WalkHistoryItem` / `useMyWalks` の削除（後続 PR で Me タブへ移す余地を残す）
- ダークモードの色調整（既存トークンに従うのみ、別途再検証は Precise 全体の別タスク）
- `lastWalkAt` の表示（`Dog` 型への追加が必要、別 PR で API 変更が要る）
