# Precise デザインシステムへのモバイルアプリ移行計画

## Context

`docs/design/Design System.html` と `docs/design/Precise Full App.html` で定義された **Precise** デザイン（Apple HIG 哲学を踏襲したオリジナル体系 — 抑制・グルーピング・大見出し・テーブル数字・ガラス素材）に、`apps/mobile` を再設計して揃える。

現行 UI はトークン (`theme/tokens.ts`) や primitives (`components/ui/`) に整理済みなので、まずトークン層を Precise 仕様に差し替えてから画面を順次書き換える。タブ構成は **Dogs / Walk / Me** に並べ替え、Settings を Me に改名する。

---

## 進め方（3 段 PR）

| # | 目的 | ブランチ例 |
|---|---|---|
| 1 | デザイントークン + UI primitives 差し替え | `feat/mobile-precise-tokens` |
| 2 | Walk フロー（Start / Active / Finish / Detail）再設計 | `feat/mobile-precise-walk` |
| 3 | Dogs 系 + Me + Auth 再設計 | `feat/mobile-precise-remaining` |

各 PR は TDD（既存テストを緑に保つ）で、コミット前に Docker Compose で iOS Simulator 起動＋スクショ検証。

---

## Phase 1 — トークンと Primitives

### 1.1 `apps/mobile/theme/tokens.ts`

- **colors (light / dark)** を Precise パレットへ
  - `background` → `#f2f2f7` / `#000`
  - `surface` → `#ffffff` / `#1c1c1e`
  - `surfaceContainer`（= 行の fill） → `rgba(118,118,128,0.12)` / `rgba(118,118,128,0.24)`
  - `onSurface` → `#000` / `#fff`
  - `onSurfaceVariant` → `rgba(60,60,67,0.6)` / `rgba(235,235,245,0.6)`
  - `textDisabled` → `rgba(60,60,67,0.3)` / `rgba(235,235,245,0.3)`
  - `border` → `rgba(60,60,67,0.18)` / `rgba(84,84,88,0.6)` （0.5 px セパレータ）
  - `interactive` → `#0a84ff`
  - `success`(new) → `#30d158`・`warning`(new) → `#ff9f0a`・`error` → `#ff453a`
  - `material` (new) → `rgba(249,249,249,0.85)` / `rgba(22,22,23,0.85)`（タブバー・シート）
- **typography** を SF/iOS スタイルへ入れ替え（`Display/Hero` は破棄し、`Inter` を system-ui スタックへ変更）
  - `largeTitle` 34/41 · 700 · -0.6
  - `title1` 28 · 700 · -0.5／`title2` 22 · 700 · -0.4
  - `headline` 17 · 600／`body` 17 · 400／`subheadline` 15 · 400
  - `footnote` 13 · 400／`caption` 12 · 600 · 0.4 (uppercase)
  - `numericBig` 32 · 700 · tabular-nums（Walk タイマー用）
- **spacing** を 4-point グリッドに正規化: `xs4 / sm8 / md12 / lg16 / xl20 / xxl24 / xxxl32 / xxxxl44 / huge60`
- **radius**: `chip4 / small8 / row12 / card16 / sheet24 / phone44`
- **elevation** を 3 段に: `low`（0 1 3 + 0 4 12）／`mid`（0 4 12 + 0 20 40）／`accentStart`（0 20 60 緑, START ボタン専用）

### 1.2 UI primitives（`apps/mobile/components/ui/`）

- `Button`: 高さ 50 / radius 14 / `font-size 17 / weight 600`。variants `primary`（tint 塗り）・`ghost`（fill 塗り）・`destructive`（red 塗り）。`size="circle"` を追加して Walk Start の 200×200 円形ボタン（緑 + accentStart shadow）に使用。
- `OutlinedCard` → **`GroupedCard`** に刷新。白サーフェス＋`card16` radius＋`low` 影。`border` は廃止（Precise は境界線でなく余白とラジアスで分離）。
- **新規** `GroupedRow`: leading 30×30 アイコンタイル / タイトル / trailing value / `›` chevron。兄弟行間は 0.5 px の `border` 色、leading アイコンの右端から開始。
- **新規** `SectionHeader`: caption スタイル uppercase、グループ前に置く。
- **新規** `Tag` / `PillTag`: 低不透明度背景＋フル発色テキスト、radius 100。Live 用に 6 px ドット付きバリアント。
- **新規** `LargeTitleHeader` / `TopAppBar`: 54 safe + 44 nav + 52 large title ブロック。`left` / `right` に tint アクション、スクロールで大見出しが小見出しに折りたたむ（MVP では折りたたみなしでも可）。
- `IconSymbol`: stroke 1.8 px / 26 px のアウトラインセットに置換（現行 SF Symbols マッピングを維持しつつ線画を再描画）。
- `TextInput`: カード内行スタイル（左ラベル + 右値）に刷新、下線 0.5 px セパレータ。

### 1.3 `hooks/use-colors.ts`

新トークン（`success` / `warning` / `material` / `onSurfaceVariant` / `textDisabled`）を露出。

### 1.4 既存テスト

`components/ui/**.test.tsx` と `components/walk/*.test.tsx` を最低限パスさせる。スナップショットは更新、意味テスト（active/disabled の色・押下挙動）は維持。

---

## Phase 2 — Walk フロー

### 2.1 タブ再構成 — `apps/mobile/app/(tabs)/_layout.tsx`

- 順序を `dogs` → `walk` → `settings`（→ `me` にリネーム）に入れ替え。
- ラベル: Dogs / Walk / **Me**（`settings.tabTitle` → `me.tabTitle` に i18n キーを移動。`en.json` = "Me", `ja.json` = "マイページ"）。
- `tabBarStyle` にぼかしマテリアル（`material` トークン）と 0.33 px 上ボーダーを適用。高さ 83、上パディング 6、下パディング 28。
- アイコンは Precise Full App `TabBar` に合わせたアウトライン SVG を `IconSymbol` 側に追加（Dogs=脚＋顔、Walk=チェック入り丸、Me=人物）。

### 2.2 Walk Start — `components/walk/WalkReadyView.tsx` ＋ `app/(tabs)/walk.tsx`

- レイアウト：Large Title "Walk" → "Walking with" キャプション → `DogSelectorSheet` トリガー（`GroupedCard` + ⌄） → "Today's goal" スライダーカード（5–60 分、現状の `SegmentedControl` は廃止し一次元スライダに差し替え） → **200×200 緑 START 円形ボタン** → キャプション「Tap to begin. We'll follow your route.」。
- `Button size="circle" variant="success"` を新設して流用。
- i18n: `walk.ready.*` のコピーを Precise voice に合わせて整える（穏やか・命令形を避ける）。

### 2.3 Walk Active — `components/walk/Walk{Map,Controls,EventActions}.tsx`

- マップを全画面背景へ。上部に 3 要素の floating glass bar（`✕` 閉じる／中央タイトル "Walk with Coco"／右上レイヤー切替）。各は radius 20 の `material` カード。
- 下部に Live Activity 風ボトムシート (`radius 32`, `material` ブラー, 上に 36×5 grabber):
  - 犬アバター ＋ 名前・副題 ＋ 右に `tag-live`（● LIVE）。
  - 3 カラム大数字 `Time / Distance / Pace`（`numericBig` + tabular, 単位はサブフォントで隣）。
  - Pee / Poop / Photo のクイック行（`fill` 背景 + 絵文字 + ラベル + count）。これは現行 `WalkEventActions` の拡張。
  - `Pause`（ghost）＋ `End Walk`（destructive）。
- タイマー表示はシート内 `Time` に統合し、`WalkControls` の独立カードは削除。
- 既存のマップ polyline 描画・ピン（pee/poo/photo マーカー）は維持、色は accent green 5 px stroke＋0.3 opacity 白 highlight にアップデート。

### 2.4 Walk Finish — `components/walk/WalkSummaryCard.tsx`

- 構成を全面差し替え:
  1. `caption` 緑 "WALK COMPLETE" ＋ 36 px heading「いいね、Coco!」 ＋ サブ「昨日のペースを 14 秒更新」。
  2. 同心リングカード（Distance=green / Time=orange / Pace=red, stroke 10 / linecap round / `rotate(-90 55 55)`）と右に凡例＋値。
  3. ミニマップ（140 高）— ルート縮小表示。
  4. Tag ピル群「💩 1 / 💧 2 / 📷 3 / 🐾 友達に会った / ☀️ 晴れ」— 現行 `walk.finishTags` は未実装なので新 `TagGroup` で追加、オンは `tint` 塗り、オフは `surface`。
  5. 底部アクション: `Add note`（ghost）＋ `Save walk`（primary, flex:1.4）。
- 「Done で walk.tsx に戻れない」625c688 の症状は、Finish 画面からの復帰経路を `onClose` コールバック → `router.navigate("/(tabs)/walk")` ＋ phase リセットに固定して確実化する（Walk 画面が `finished` phase に貼り付く現象の根本原因: phase リセットが conditional）。
- 「詳細」は Save 後に walk detail へ push し、Finish 画面は stack から pop。

### 2.5 Walk Detail — `app/walks/[id].tsx`

- ヘッダーを transparent glass の `‹ Coco` / `⋯`。
- マップを 260 高 `card16` カードへ。polyline + start/end ピン + 写真ピン（白ドット＋青枠＋📷）。
- `caption` uppercase 日付 → `title1` "朝の散歩"。
- 3 カラム大数字カード（Distance / Duration / Pace）。
- イベントタイムラインを `GroupedCard` + `GroupedRow` に置換（絵文字 22 幅 / 時刻 tabular 44 幅 / 本文）。

### 2.6 i18n 調整

`walk.*` キーを Precise voice に合わせて見直し：
- `walk.ready.title` → "散歩"（英: "Walk"）
- `walk.ready.startHint` → "タップして開始。道のりはこちらで記録します。"
- `walk.finished.heroLine` → "{{dog}}、おつかれさま"
- `walk.finished.beatPace` → "昨日より {{seconds}} 秒速いペース"
- `walk.active.live` → "LIVE"
- `walk.events.pee/poop/photo` はアイコン＋ラベルのまま維持

---

## Phase 3 — Dogs / Me / Auth

### 3.1 Dogs list — `app/(tabs)/dogs.tsx` + `DogListItem`

- Large Title "Dogs" ＋ 右に `+ Add`（tint テキストボタン）。
- 先頭に "Today's walking goal" ロールアップカード（conic-gradient の進捗リング 44 + タイトル + `3.52 / 5.0 km across your pack` + ›）。現行 `BentoCard` を流用しレイアウトだけ差し替え。
- セクションヘッダー `YOUR PACK`。
- 行カード: 56 円形アバター / 名前 ＋ `🔥12d` streak チップ / 副題 `breed · age` / `stats`（`1.42 km today · 47 walks`, tabular） / `›`。

### 3.2 Dog detail — `app/dogs/[id]/index.tsx`

- 0–300 に hero グラデ背景 ＋ 大型絵文字/写真（drop-shadow 強）。下に `bg` へのフェード。
- 250 付近に name（title1）＋ breed/age/weight 行。
- 320 に 3 セル stats カード（`Walks` / `km` / `Streak`, 縦 0.5 px セパレータ）。
- 416 に Section title "Walks" ＋ `See all`。
- Walks を `GroupedCard` + `GroupedRow`（36 青マーク / 日付 + 速度 / `💧n 💩m` / ›）。

### 3.3 Me（旧 Settings）— `app/(tabs)/settings.tsx`

- プロフィールカード: 60 円形イニシャル（accent グラデ）＋ 名前 / email / `View profile`（tint）。
- 3 グループ: **Preferences**（Language / Units / Notifications / Appearance）・**Legal**（Terms / Privacy / About） ・**Sign out**（単独カード、赤中央）。
- 行は `GroupedRow`（icon 30 tile + label + value + ›）。
- 既存 `EncounterDetectionSection` は Preferences グループ内に "Nearby dogs"（仮）として組み込む。

### 3.4 Auth — `app/(auth)/login.tsx`, `register.tsx`

- 上部 68 角丸 22 のアプリマーク（緑→青グラデ + 中に脚型 SVG）。
- Large heading "Welcome back" / "Let's meet your dog."
- 入力は `GroupedCard` の行スタイル（左ラベル 70–96 / 右値・`TextInput`）。
- Primary CTA は 50 高／radius 14 ／tint。SNS ログインは黒ボタン（`Continue with Apple`）として Cognito HostedUI への既存フローを流用（feedback_auth_via_api に従い API 経由）。

### 3.5 Dog new / edit / members / encounters

- 同じ `GroupedCard + GroupedRow + LargeTitleHeader + Button` の組み合わせで書き換え。特別な新規コンポーネントは不要。

---

## 修正対象ファイル

### Phase 1
- `apps/mobile/theme/tokens.ts`
- `apps/mobile/hooks/use-colors.ts`
- `apps/mobile/components/ui/Button.tsx` (+ test)
- `apps/mobile/components/ui/OutlinedCard.tsx` → `GroupedCard.tsx`（リネーム＋書き換え）
- `apps/mobile/components/ui/GroupedRow.tsx`（新規）
- `apps/mobile/components/ui/SectionHeader.tsx`（新規）
- `apps/mobile/components/ui/Tag.tsx`（新規）
- `apps/mobile/components/ui/LargeTitleHeader.tsx`（新規）
- `apps/mobile/components/ui/IconSymbol.tsx`
- `apps/mobile/components/ui/TextInput.tsx`

### Phase 2
- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/app/(tabs)/walk.tsx`
- `apps/mobile/components/walk/WalkReadyView.tsx` (+ test)
- `apps/mobile/components/walk/DogSelectorSheet.tsx`
- `apps/mobile/components/walk/WalkMap.tsx`
- `apps/mobile/components/walk/WalkControls.tsx`（縮小・統合）
- `apps/mobile/components/walk/WalkEventActions.tsx`
- `apps/mobile/components/walk/WalkSummaryCard.tsx`（全面差し替え）
- `apps/mobile/app/walks/[id].tsx`
- `apps/mobile/lib/i18n/locales/en.json`, `ja.json`

### Phase 3
- `apps/mobile/app/(tabs)/dogs.tsx`
- `apps/mobile/components/dogs/DogListItem.tsx`, `DogStatsCard.tsx`
- `apps/mobile/app/dogs/[id]/index.tsx`, `edit.tsx`, `new.tsx`, `members.tsx`, `encounters.tsx`, `friends/[friendDogId].tsx`
- `apps/mobile/app/(tabs)/settings.tsx`（ディレクトリ名は保持、画面タイトル/tabTitle のみ `me` へ）
- `apps/mobile/app/(auth)/login.tsx`, `register.tsx`
- i18n：`settings.*` → `me.*`（下位互換のため旧キーを残すか、全面切替かは Phase 3 着手時に判断）

---

## 再利用する既存機能

- `useColors()` / `useTheme()` — トークン参照の集約点。トークン拡張だけで Primitive は自動追従。
- `OutlinedCard` → `GroupedCard` リネームは shim を 1 リリース挟む（名前衝突の import を一括置換）。
- 既存 i18n キー大半は保持し、文言のみ差し替え。
- Walk 計測ロジック（`useWalkRecording` 等）は触らず、表示コンポーネントのみ再設計。
- Cognito 認証フロー（`feedback_auth_via_api`）は API 経由のまま、UI だけ差し替え。

---

## 検証手順

1. **ユニットテスト**：`docker compose run --rm mobile npm test -- --run` が緑（snapshot 更新後も含む）。
2. **型**：`docker compose run --rm mobile npm run typecheck`。
3. **Lint**：`docker compose run --rm mobile npm run lint`。
4. **iOS Simulator ビジュアル検証**（`ios-sim-test` skill）：
   - Phase 1 後: Button / GroupedCard / GroupedRow のテストハーネス画面で light/dark を確認。
   - Phase 2 後: Walk Start → START → Active シートで Pee/Poo/Photo をタップ → End Walk → Finish → Save → Walk Detail。625c688 で出た「Walk Complete に貼り付く」症状が解消し `Walk` タブに戻れることを確認。
   - Phase 3 後: Dogs / Dog detail / Me / Login / Register の全画面スクショを light・dark で比較。
5. **統合**：1 台の実機（Personal Team 署名）で散歩を 1 周し、保存まで到達することを確認。
6. **アクセシビリティ**：最小行高 44 px、コントラスト比 4.5:1 以上（黒テキスト on `#f2f2f7`、白テキスト on `#1c1c1e`）を spot-check。
