# モバイル UI 画面・コンポーネント棚卸し

- **調査日**: 2026-06-28
- **対象**: `apps/mobile/app/` の Expo Router leaf route と、その主要表示コンポーネント
- **目的**: UI 整理の前提として、現状の画面数、各画面の役割、表示要素を保存する

## サマリ

現状、UI 整理の対象として見るべき画面は **12画面**。

Expo Router の leaf route は 14 個あるが、以下 2 route は画面を描画しないため UI 整理対象から除外する。

| route | 扱い | 理由 |
| --- | --- | --- |
| `apps/mobile/app/index.tsx` | 除外 | `/(tabs)/walk` へ redirect するだけ |
| `apps/mobile/app/walk-recording.tsx` | 除外 | 旧 deep link / Live Activity URL 互換 bridge。記録 UI は Walk タブが所有する |

画面の内訳:

| 分類 | 画面数 | route |
| --- | ---: | --- |
| 認証 | 2 | `(auth)/login`, `(auth)/signup` |
| タブ | 3 | `(tabs)/dogs`, `(tabs)/walk`, `(tabs)/user` |
| 犬 | 3 | `dogs/new`, `dogs/[id]/index`, `dogs/[id]/edit` |
| ユーザー | 1 | `user/edit` |
| 設定 | 2 | `settings/index`, `settings/email` |
| 散歩履歴 | 1 | `walks/[id]` |

補足: `/(tabs)/walk` は route としては 1 画面だが、UI は `ready` / `recording` / `finished` の 3 状態を持つ。UI 整理では **1画面3状態** として扱う。

## 画面別棚卸し

### 1. ログイン画面

- **route**: `apps/mobile/app/(auth)/login.tsx`
- **主要コンポーネント**: `AuthScreenLayout`, `AppMark`, `EmailAuthForm`, `OneTimePasswordInput`, `Button`, `TextInput`
- **役割**: 既存ユーザーのメール OTP ログイン

表示要素:

- アプリマーク
- 見出し「おかえりなさい」
- 説明文「愛犬との散歩を続けるためにログインします。」
- メール入力フィールド
- 「ログイン」ボタン
- OTP 送信後のコード入力
- コード確認中表示
- エラー表示
- 利用規約 / プライバシーポリシーへの同意説明
- 「はじめてですか？」の説明
- 「アカウントを作成」リンク

### 2. アカウント作成画面

- **route**: `apps/mobile/app/(auth)/signup.tsx`
- **主要コンポーネント**: `AuthScreenLayout`, `BackButton`, `EmailAuthForm`, `OneTimePasswordInput`, `Button`, `TextInput`
- **役割**: 新規ユーザーのメール OTP 登録

表示要素:

- 戻るボタン
- 見出し「愛犬との散歩を始めましょう。」
- 説明文「アカウントを作成すれば、すぐに散歩を始められます。」
- メール入力フィールド
- 補足説明文「犬のプロフィールは次のステップで追加できます。ペース、目標、写真を記録します。」
- 「続ける」ボタン
- OTP 送信後のコード入力
- コード確認中表示
- エラー表示
- 利用規約 / プライバシーポリシーへの同意説明

### 3. 愛犬一覧画面

- **route**: `apps/mobile/app/(tabs)/dogs/index.tsx`
- **主要コンポーネント**: `ScreenHeader`, `FlatList`, `DogListItem`, `SectionHeader`, `EmptyState`, `LoadingScreen`
- **役割**: 登録済み犬の一覧と犬追加導線

表示要素:

- ヘッダー「愛犬」
- 右上の「＋ 追加」ボタン
- セクション見出し「YOUR PACK」
- 犬リスト行
- 犬写真
- 犬名
- 犬種、または今日の散歩統計
- 連続日数バッジ
- 詳細画面へ進む chevron
- Pull-to-refresh
- 空状態メッセージ「まだ犬が登録されていません」
- 空状態の「犬を追加」ボタン
- 読み込み表示

### 4. 散歩画面

- **route**: `apps/mobile/app/(tabs)/walk/index.tsx`
- **主要コンポーネント**: `WalkMapShell`, `WalkMap`, `WalkTopChip`, `WalkFloatingSheet`, `WalkReadySheetContent`, `WalkRecordingControlsOverlay`, `WalkSummaryCard`
- **役割**: 散歩開始、記録中操作、散歩終了後サマリーを同じ route で扱う

#### 4-1. 開始前状態

- **状態**: `ready`
- **主要コンポーネント**: `WalkMap`, `WalkTopChip`, `WalkFloatingSheet`, `WalkReadySheetContent`, `DogPickerCard`, `WalkReadyStatsRow`, `WalkStartButton`, `NoDogsBody`

表示要素:

- 全画面マップ
- 上部チップ「散歩」
- 下部 floating sheet
- sheet grabber
- 犬選択カード
- 犬写真
- 犬名
- 前回散歩の表示
- 複数犬時の選択チェック
- 複数犬時の「一緒に散歩」見出し
- 複数犬時の「すべて選択 / すべて解除」
- 今日の距離
- 連続日数
- 目標進捗
- 「散歩を開始」ボタン

犬未登録時の表示要素:

- 犬アイコン
- 見出し「まだ犬がいません」
- 説明文「散歩を始める前にパックに犬を追加しましょう。すぐに終わります。」
- 「はじめての犬を追加」ボタン

#### 4-2. 記録中状態

- **状態**: `recording`
- **主要コンポーネント**: `WalkMap`, `WalkTopChip`, `WalkRecordingControlsOverlay`, `WalkControls`, `WalkEventActions`, `WalkMinimizedControls`, `WalkControlsActions`

表示要素:

- 全画面マップ
- GPS ルート線
- 現在地マーカー
- 現在地上の犬アバター
- おしっこ / うんちイベントマーカー
- 上部チップ
- 記録中 floating controls
- 犬アバター
- 犬名、または複数犬名
- LIVE タグ
- 朝 / 昼 / 夜の散歩ラベル、またはグループ散歩ラベル
- 時間
- 距離
- ペース
- 縮小ボタン
- 単独犬時のおしっこ記録ボタン
- 単独犬時のうんち記録ボタン
- 複数犬時の犬別イベント行
- 複数犬時の犬別おしっこ / うんち回数
- 一時停止 / 再開ボタン
- 「散歩を終了」ボタン
- 終了失敗時の Alert

縮小表示の要素:

- 犬アバター
- 経過時間
- 距離
- LIVE タグ
- 展開ボタン

#### 4-3. 終了後状態

- **状態**: `finished`
- **主要コンポーネント**: `ScreenHeader`, `WalkSummaryCard`, `WalkRoutePreview`, `PerDogSummaryCard`, `Button`

表示要素:

- ヘッダー「散歩」
- 完了ラベル「散歩おわり」
- 完了メッセージ
- 犬アバタースタック
- 散歩時間のサブタイトル
- ルートプレビュー地図
- ルート開始 / 終了マーカー
- 距離 / 時間 / ペースのピル
- 複数犬時の犬別集計カード
- 犬別のおしっこ / うんち / 写真回数
- 「個別に見る」リンク
- 保存先メモ
- 「メモを追加」ボタン
- 「散歩を保存」ボタン

### 5. マイページ画面

- **route**: `apps/mobile/app/(tabs)/user/index.tsx`
- **主要コンポーネント**: `ScreenHeader`, `ScrollView`, `UserSummary`, `UserAvatar`, `GroupedCard`, `GroupedRow`
- **役割**: ユーザー自身の散歩貢献とアカウント導線を表示する

表示要素:

- ヘッダー「マイページ」
- 右上の「編集」ボタン
- ユーザーアバター
- 表示名
- メールアドレス
- 利用開始時期
- 統計カード
- 散歩回数
- 距離
- 合計時間
- 愛犬数
- 今週の散歩カード
- 今週合計距離
- 曜日別バーグラフ
- 「メールを変更」行
- 「設定」行
- 読み込み表示
- エラー表示と再試行

### 6. 犬登録画面

- **route**: `apps/mobile/app/(tabs)/dogs/new.tsx`
- **主要コンポーネント**: `ScreenHeader`, `ScrollView`, `DogForm`, `TextInput`
- **役割**: 新しい犬の基本プロフィールを登録する

表示要素:

- インラインヘッダー「犬を登録」
- 「キャンセル」ボタン
- 「保存」ボタン
- 名前入力フィールド
- 犬種入力フィールド
- 性別選択行
- 性別 ActionSheet
- 誕生日選択行
- 誕生日選択モーダル
- 誕生日の年カラム
- 誕生日の月カラム
- 誕生日の日カラム
- 誕生日モーダルのキャンセルアイコン
- 誕生日モーダルの保存アイコン

補足: 新規登録画面では `DogForm` に `showDailyGoal={false}` を渡すため、目標セクションは表示しない。

### 7. 犬詳細画面

- **route**: `apps/mobile/app/(tabs)/dogs/[id]/index.tsx`
- **主要コンポーネント**: `DogHero`, `DogStatsCard`, `GoalProgressCard`, `DogWalksList`, `DogWalkRow`, `BackButton`
- **役割**: 犬単体のプロフィール、目標進捗、散歩履歴を見る

表示要素:

- 大きい犬写真ヒーロー
- 戻るボタン
- 「編集」ボタン
- 犬名
- 年齢 / 犬種 / 性別などのメタ情報
- 統計カード
- 散歩回数
- 合計距離
- 連続日数
- 目標進捗カード
- 進捗リング
- 今日または今週の目標進捗テキスト
- 散歩履歴セクション
- 散歩履歴行
- 履歴の日付
- 距離
- 時間
- ペース
- おしっこ / うんち回数
- 散歩詳細へ進む chevron
- 散歩履歴なし表示
- 散歩履歴エラー表示
- 再試行ボタン
- 読み込み表示

### 8. 犬編集画面

- **route**: `apps/mobile/app/(tabs)/dogs/[id]/edit.tsx`
- **主要コンポーネント**: `ScreenHeader`, `DogAvatarEditor`, `DogForm`, `TextInput`, `SegmentedControl`, `@expo/ui/swift-ui` `Slider`
- **役割**: 犬のプロフィール、写真、散歩目標を編集する

表示要素:

- インラインヘッダー「犬を編集」
- 「キャンセル」ボタン
- 「保存」ボタン
- 犬写真エディタ
- 写真プレビュー
- 写真未設定時のプレースホルダー
- 「写真を変更」ボタン
- 写真ライブラリ権限エラー Alert
- 名前入力フィールド
- 犬種入力フィールド
- 性別選択行
- 性別 ActionSheet
- 誕生日選択行
- 誕生日選択モーダル
- 目標セクション
- 周期の segmented control
- DAILY / WEEKLY 切り替え
- 目標時間表示
- 目標時間スライダー
- 目標時間の最小 / 最大表示
- 犬削除ボタン
- 犬削除確認 Alert
- 読み込み表示

### 9. ユーザー編集画面

- **route**: `apps/mobile/app/(tabs)/user/edit.tsx`
- **主要コンポーネント**: `ScreenHeader`, `UserAvatarEditor`, `UserAvatar`, `GroupedCard`, `TextInput`
- **役割**: ユーザー表示名と写真を編集する

表示要素:

- インラインヘッダー「ユーザーを編集」
- 「キャンセル」ボタン
- 「保存」ボタン
- ユーザー写真エディタ
- ユーザーアバター
- 写真未設定時のイニシャル表示
- カメラバッジ
- 「写真を変更」ボタン
- 写真ライブラリ権限エラー Alert
- 名前入力フィールド
- 読み込み表示
- エラー表示と再試行

### 10. 設定画面

- **route**: `apps/mobile/app/(tabs)/user/settings/index.tsx`
- **主要コンポーネント**: `ScreenHeader`, `PreferencesSection`, `LegalSection`, `SignOutRow`, `GroupedCard`, `GroupedRow`, `ConfirmDialog`
- **役割**: 表示設定、法的リンク、サインアウト導線をまとめる

表示要素:

- インラインヘッダー「設定」
- 戻るボタン
- セクション見出し「環境設定」
- 言語行
- 言語 ActionSheet
- 単位行
- 単位 ActionSheet
- 通知行
- 外観行
- 外観 ActionSheet
- セクション見出し「法的情報」
- 利用規約行
- プライバシーポリシー行
- このアプリについて行
- アプリバージョン表示
- サインアウト行
- サインアウト確認ダイアログ
- 読み込み表示
- エラー表示と再試行

### 11. メール変更画面

- **route**: `apps/mobile/app/(tabs)/user/settings/email.tsx`
- **主要コンポーネント**: `ScreenHeader`, `GroupedCard`, `GroupedRow`, `TextInput`, `Button`, `OneTimePasswordInput`
- **役割**: ログイン中ユーザーのメールアドレス変更

表示要素:

- インラインヘッダー「メールを変更」
- 戻るボタン
- 現在のメール表示
- 新しいメール入力フィールド
- 「コードを送信」ボタン
- OTP 送信後の説明文
- OTP コード入力
- コード確認中表示
- エラー表示
- 読み込み表示
- エラー表示と再試行

### 12. 散歩詳細画面

- **route**: `apps/mobile/app/(tabs)/walk/walks/[id].tsx`
- **主要コンポーネント**: `MapView`, `Polyline`, `Marker`, `GroupedCard`, `WalkEventTimeline`, `Image`
- **役割**: 保存済み散歩のルート、メトリクス、担当者、イベント履歴を表示する

表示要素:

- ナビゲーションヘッダー「散歩詳細」
- 戻るボタン
- マップカード
- GPS ルート線
- おしっこ / うんち / 写真イベントマーカー
- 日付ラベル
- タイトル「散歩詳細」
- 犬名一覧
- 開始 / 終了時刻
- メトリクスカード
- 距離
- 時間
- ペース
- 散歩した人セクション
- 散歩した人のアバター、またはイニシャル
- 散歩した人の名前
- イベントタイムライン
- イベント発生時刻
- イベント絵文字
- イベント名
- 写真イベントのサムネイル
- 写真の全画面プレビューモーダル
- 写真プレビューの閉じるボタン
- 読み込み表示

## 共通 UI コンポーネント

複数画面で再利用されている UI 部品:

| コンポーネント | 主な用途 |
| --- | --- |
| `ScreenHeader` | large title / inline header、戻る、保存、編集、追加など |
| `BackButton` | 戻る導線 |
| `GroupedCard` | iOS settings 風の grouped surface |
| `GroupedRow` | 設定行、アカウント導線、値付き行 |
| `TextInput` | top label / inline label の入力欄 |
| `Button` | primary / secondary / ghost / destructive などの汎用ボタン |
| `EmptyState` | 空状態メッセージと CTA |
| `LoadingScreen` | 読み込み状態 |
| `ErrorScreen` | エラー状態と再試行 |
| `ConfirmDialog` | サインアウトなどの確認ダイアログ |
| `UserAvatar` | ユーザー写真またはイニシャル |
| `OneTimePasswordInput` | OTP コード入力 |

## UI 整理時の注意点

- Walk タブは通常記録中の UI 所有者。`/walk-recording` を記録 UI の所有者へ戻さない。
- Walk タブの `ready` / `recording` / `finished` は同じ route 内の状態差分として扱う。
- 犬詳細画面には削除導線を置かず、削除は犬編集画面へ集約されている。
- Me タブはプロフィールと散歩貢献を主表示し、表示設定や法務リンクは `/(tabs)/user/settings` に置く。
- map 主役の画面は `ScreenHeader` で上を押し下げず、マップ全面 + overlay 構成を維持する。
- 入力・設定 UI は grouped row 形式と `ActionSheetIOS` ベースの選択を第一候補にする。
- スタイルを変更する場合は `apps/mobile/theme/tokens.ts` の token を使い、magic number を増やさない。
- UI 整理の判断は product axes で説明する:
  - Dog experience: 犬同士の出会い、犬との関係性を深めるか
  - Walk data: 将来の散歩品質や洞察に役立つデータになるか
  - Owner contribution: 飼い主がまた散歩したくなるか
