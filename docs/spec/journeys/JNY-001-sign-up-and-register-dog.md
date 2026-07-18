# JNY-001 Sign Up and Register Dog

Requirement links: IDA-001..019、USR-001..021、DOG-001..020、MED-001。

## Purpose and Preconditions

初めての利用者がemail OTPでUserになり、最低限のprofileと最初の犬を登録して散歩を開始できる状態へ到達します。利用者は受信可能なemailを持ち、未認証です。

## Normal Flow and Boundaries

1. App ShellがIdentityのSign Up routeを表示する。
2. IdentityがOTPを発行・検証し、内部UserIdを作って`UserRegistered v1`を公開する。
3. User Profileがeventを受け、空のprofile/preferencesを作る。
4. 利用者がdisplay nameを保存する。avatarを選ぶ場合はMediaで`user_avatar`をreadyにし、ProfileへAssetIdだけを渡す。
5. Dog Managementの登録画面へ進み、name、genderと任意項目を入力する。
6. dog avatarを選ぶ場合はMediaで`dog_avatar`をreadyにする。
7. Dog ManagementがDogと`owner` roleを保存し、`DogRegistered v1`を公開する。
8. App ShellがDogs tabの登録済み状態へ遷移する。

Identity、Profile、Dogは互いのDBへ接続せず、UserId、AssetId、公開event/APIだけを使用します。

## Partial Failure and Recovery

Profile作成eventが遅延した場合は準備中として再試行し、Userを重複作成しません。Media失敗時は入力を保持して画像なし登録または再試行を選べます。Dog登録失敗時も認証とprofileは有効で、同じrequestIdから再開します。

## Final Data State

Identityにactive User、Profileに同じUserIdのprofile/preferences、Dogにactive Dogとowner roleが一件あります。Mediaを使用した場合だけready Assetと参照が存在します。OTPとtokenはdomain DB・logに存在しません。

## Acceptance

同じemailやrequestの再送でUser、Profile、Dogを重複作成せず、登録した犬がWalk start候補として取得できます。
