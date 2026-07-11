# Eメール変更画面 E2Eテスト項目

Eメール変更画面 `/settings/email` の現行実装を基準に整理します。OTPはテスターがメールを確認してSimulatorへ手入力します。

## 1. 取得・初期表示

- Me画面のChange emailから開く
- Loading、取得Error、Readyを分岐する
- ErrorからRetryできる
- header、Back、Current email、New email、Send codeを表示する
- 現在メールを読み取り専用で表示する
- New email未入力ではSend codeを無効にする
- Change passwordを表示しない
- Backで変更せずMeへ戻る

## 2. New email入力

- 有効な新メールでSend codeを有効にする
- 前後空白を除去する
- 現在メールと大文字小文字を無視して同じ場合は無効にする
- Email keyboard、自動大文字化なし、自動修正なしを確認する
- Return keyからも送信できる
- 不正形式、空白、制御文字、極端な長さを拒否する
- 連続送信を防ぐ

現状差分：形式検証は空でなく現在メールと異なることだけです。

## 3. OTP要求

- changeEmailへtrim済みメールを送る
- ローディング中は再送信を無効にする
- 成功後にOTP入力へ切り替え、送信先と桁数を表示する
- 既使用メール、session expired、network、一般失敗を区別する
- timeout、rate limit、再送要件を明示する

現状差分：OTP再送や入力メールへ戻る操作はありません。

## 4. 人手によるOTP確認

- ランナーはOTP入力で一時停止し、送信先・手順・timeoutを示す
- 数字入力、paste、桁数、重複検証防止を確認する
- 検証中表示と入力無効化を確認する
- 正しいOTPでconfirmEmailChangeを実行する
- 誤コード、期限切れ、session expired、network、一般失敗を表示する
- 失敗後にcodeをclearして再試行できる
- 人による中断・timeoutを明示的な結果にする

## 5. 成功後の整合性

- 成功後にユーザー関連queryをinvalidateする
- invalidate完了後に前画面へ戻る
- Me画面に新メールを表示する
- アプリ再起動後も新メールで認証状態を維持する
- 旧メールと新メールのどちらで次回ログインできるかCognito仕様どおり確認する
- refresh token rotation後も新しいidentityで利用できる
- 複数端末・古いtokenの扱いを確認する

## 6. 異常・セキュリティ

- invalidate失敗時にメール変更済みの事実を見失わない
- API成功後の通信断から再取得で実状態へ収束する
- OTP、challenge/session、access/refresh tokenをログへ残さない
- 他ユーザーのメールへ不正変更できない
- rate limitや総当たりを防止する
- バックグラウンド復帰でchallengeを破損しない

## 7. アクセシビリティ・証跡

- header、Back、現在メール、新メール、Send code、OTP、エラーをVoiceOverで識別する
- Dynamic Type、日本語・英語、Light・Darkを確認する
- 初期、OTP待ち、成功、各失敗を画像・動画で保存する
- 人手OTPの続行・中断・timeoutと、秘密情報をマスクしたAPIログを保存する
