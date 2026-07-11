# 設定画面 E2Eテスト項目

設定画面 `/settings` の現行実装を基準に整理します。`/setting`ではありません。

## 1. 取得・初期表示

- Me画面のSettingsから開く
- Loading、Error、Readyを明確に分岐する
- ErrorからRetryして復旧する
- inline header「Settings」とBackを表示する
- Preferences、Legal、Sign Outを表示する
- BackでMeへ戻る
- 未認証、不正route、連続遷移を安全に扱う

## 2. Language

- Language行に現在値を表示する
- iOS Action Sheetで日本語・English・Cancelを表示する
- 選択直後にアプリ文言を切り替える
- Cancelでは変更しない
- 再起動後も選択言語を維持する
- 保存失敗時に表示値と永続値を不整合にしない

## 3. Units

- Units行にkmまたはmileを表示する
- Action Sheetでkm、mile、Cancelを表示する
- 選択を散歩記録中の距離・ペースへ反映する
- 履歴、散歩詳細、Me集計にも一貫して反映する
- 再起動後も維持する

現状差分：Walk記録中はunitsを参照しますが、Me・犬履歴・散歩詳細にはkm固定箇所があります。

## 4. Notifications

- Notifications行と現在値Onを表示する
- VoiceOverで現在値を認識できる
- タップ時の仕様を確認する

現状差分：Notifications行はchevronを表示しますが`onPress`がなく、操作できません。

## 5. Appearance

- Light、Dark、Auto、CancelをAction Sheetに表示する
- 選択直後にテーマを反映する
- Autoはsystem appearanceへ追従する
- Cancelでは変更しない
- 再起動後も維持する
- 保存失敗時の不整合を検知する

## 6. Legal・About

- Termsが正しい`/terms` URLを開く
- Privacyが正しい`/policy` URLを開く
- 外部ページから戻れる
- オフライン・不正URL・open失敗でクラッシュしない
- Aboutに実際のapp versionを表示する
- Aboutタップ時の仕様を確認する

現状差分：Aboutはchevron付きですが`onPress`がなく、Legal URL失敗も処理されません。

## 7. Sign Out

- Sign Outで確認Dialogを表示する
- Cancelで認証状態を維持する
- 確定でtokenを削除しログインへ遷移する
- サインアウト中は連打できない
- 失敗時もloading/Dialog状態が永久に残らない
- active walk中のサインアウト可否と記録保護を確認する
- 再起動後もログアウト状態を維持する

現状差分：signOut失敗をユーザーへ表示するcatchはありません。

## 8. アクセシビリティ・証跡

- header、Back、全行、値、Action Sheet、DialogをVoiceOverで操作する
- Dynamic Type、日本語・英語、Light・Darkを確認する
- Loading、Error、各設定変更、Legal、Sign Outを画像・動画で保存する
- AsyncStorage値、認証状態、外部URLを秘密情報なしで記録する
