# iOS 画面遷移設計ガイド

- **作成日**: 2026-06-28
- **対象**: `apps/mobile/` の iOS / iPadOS 向け画面設計
- **目的**: 一覧、詳細、新規追加、編集、補助操作などの画面遷移を iOS 標準の考え方に沿って整理する

## サマリ

画面遷移は、まずユーザーの行為を次の 3 種類に分けて判断する。

1. **階層を深掘る**: 一覧から詳細へ進む、親カテゴリから子項目へ進む。
2. **現在の文脈の上で一時作業する**: 新規追加、短い編集、確認、選択。
3. **アプリの大分類を切り替える**: ホーム、散歩、愛犬、マイページなどの主要領域を移動する。

原則として、階層を深掘る場合は **Push / ドリルダウン**、一時作業は **Sheet / Modal**、主要領域の切り替えは **Tab** を使う。

## 条件と遷移方法

| 条件 | 遷移方法 | 例 | SwiftUI / UIKit |
| --- | --- | --- | --- |
| 一覧から 1 件を選び、詳細へ進む | ドリルダウン / Push | 犬一覧 -> 犬詳細、散歩履歴 -> 散歩詳細 | `NavigationStack`, `NavigationLink`, `UINavigationController` |
| 階層構造を深くたどる | ドリルダウン / Push | 設定カテゴリ -> 詳細設定 | `NavigationStack` |
| iPad など広い画面で、一覧と詳細を同時に見せたい | Split view | サイドバー -> 一覧 -> 詳細 | `NavigationSplitView`, `UISplitViewController` |
| 新規作成など、現在の画面に戻る前提の一時作業 | Sheet / Modal | 新しい犬を登録、散歩メモを追加 | `.sheet`, `UISheetPresentationController` |
| 新規作成が複数ステップで、モーダル内でさらに進む | Sheet 内の NavigationStack | 犬登録 -> 写真追加 -> 確認 | `.sheet` + `NavigationStack` |
| 現在の作業を完全に覆う必要がある | Full-screen modal | ログイン、オンボーディング、カメラ、決済 | `.fullScreenCover` |
| 主要機能カテゴリを切り替える | Tab | 散歩 / 愛犬 / マイページ | `TabView`, `UITabBarController` |
| その場の補助操作を選ぶ | Menu / Confirmation dialog / Action sheet | 並び替え、共有、削除確認 | `Menu`, `.confirmationDialog`, `UIAlertController` |
| iPad で特定ボタンや要素に紐づく補助情報を出す | Popover | フィルタ、説明、詳細オプション | `.popover`, `UIPopoverPresentationController` |
| 重大な確認・警告を出す | Alert | 削除確認、通信失敗、権限不足 | `.alert`, `UIAlertController` |
| 検索・フィルタで表示内容だけを変える | 画面遷移しない | 犬一覧内検索、散歩履歴の期間フィルタ | 同一画面内の状態変更 |
| 編集対象そのものが主画面の一部 | Push 先で編集 / Edit mode | 犬詳細 -> 犬編集 | `NavigationStack` + edit state |
| 編集が短く、終わったら元画面へ戻る | Sheet | 名前変更、メモ追加 | `.sheet` |

## 判断ルール

### 1. 「戻る」で元の一覧へ戻る関係なら Push

一覧 -> 詳細、親 -> 子、カテゴリ -> 項目のように、情報階層を進む場合は Push を使う。

Walking Dog では、愛犬一覧から犬詳細へ進む、散歩履歴から散歩詳細へ進む、といった遷移が該当する。

### 2. 完了・キャンセルがある作業なら Sheet

新規追加、短い編集、フォーム入力、共有前の確認など、作業を終えたら元の画面に戻るものは Sheet を使う。

Walking Dog では、犬の新規登録、散歩メモの追加、散歩イベントの補足入力などが該当する。作業の独立性が高く、ユーザーが「今の画面に一時的に被せている」と理解できる場合に向いている。

### 3. 主要領域なら Tab

アプリの主要領域は Tab で切り替える。Tab は階層の上下関係ではなく、横並びの大分類を表す。

Walking Dog では、散歩、愛犬、マイページのようなトップレベル領域が該当する。各 Tab は独立した `NavigationStack` を持つ前提にすると、Tab ごとの履歴を保ちやすい。

### 4. 広い画面では Split を検討する

iPhone では Push、iPad では Split view に適応すると自然な画面がある。特に、一覧と詳細を同時に見せる価値がある場合に向いている。

Walking Dog では、散歩履歴一覧と散歩詳細、犬一覧と犬詳細、設定カテゴリと設定詳細が候補になる。

### 5. ユーザーの流れを止める必要がある時だけ Alert / Full-screen

Alert や Full-screen modal は注意を強く奪う。削除確認、通信失敗、権限不足、ログイン、オンボーディング、カメラなど、流れを止める理由が明確な場合に限定する。

## Walking Dog での適用例

| 画面・操作 | 推奨遷移 | 理由 |
| --- | --- | --- |
| 愛犬一覧で犬を選ぶ | Push | 犬詳細という下位階層へ進むため |
| 愛犬一覧の「追加」 | Sheet、または登録フローが長い場合は full-screen modal | 現在の一覧文脈から新規作成する一時作業のため |
| 犬詳細の「編集」 | Push または Sheet | 詳細情報全体の編集なら Push、名前など短い編集なら Sheet |
| 散歩履歴で 1 件を選ぶ | Push | 履歴一覧から詳細へ進むため |
| 散歩メモを追加 | Sheet | 散歩詳細の上で行う短い入力作業のため |
| 散歩中の終了確認 | Confirmation dialog / Alert | 記録終了は取り消しにくい操作のため |
| 認証画面 | Full-screen modal または認証専用 stack | アプリ利用前に完了すべき入口のため |
| 設定一覧からメール変更へ進む | Push | 設定階層の詳細へ進むため |
| 並び替え・フィルタ | Menu / Sheet / 同一画面内状態変更 | 情報階層ではなく表示条件の変更のため |

## 実装メモ

- SwiftUI では、階層遷移は `NavigationStack` と route enum で表す。
- Tab ごとに独立した `NavigationStack` を持つと、各 Tab の履歴を自然に保持できる。
- Sheet は `.sheet(item:)` を優先し、複数の Sheet は enum で管理する。
- Sheet 内でさらに画面を進める必要がある場合は、Sheet の中に `NavigationStack` を置く。
- Alert / confirmation dialog は、破壊的操作、権限、失敗、取り消し不能に近い操作に限定する。
- 画面遷移で解決しなくてよいもの、例えば検索・フィルタ・セグメント切り替えは同一画面内の状態変更で扱う。

## 参考

- [UINavigationController](https://developer.apple.com/documentation/uikit/uinavigationcontroller)
- [NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack)
- [UISheetPresentationController](https://developer.apple.com/documentation/uikit/uisheetpresentationcontroller)
- [UITabBarController](https://developer.apple.com/documentation/uikit/uitabbarcontroller)
- [UISplitViewController](https://developer.apple.com/documentation/uikit/uisplitviewcontroller)
- [UIAlertController](https://developer.apple.com/documentation/uikit/uialertcontroller)
