# JNY-005 Manage Profile and Preferences

## Outcome

利用者が表示名・avatarと、言語、単位、appearance、通知設定を管理し、email変更とsign-outを適切なIdentity機能へ進めます。

## Context Sequence

1. User Profileがprofile/preferencesを返す。
2. emailはIdentityの`myIdentity`から表示し、Profileへ複製しない。
3. avatar変更はMediaでuser_avatarをreadyにした後、ProfileがAssetIdを参照する。
4. email変更とsign-outはIdentity route/operationへ委譲する。
5. App Shellがlocale、appearance、認証状態を全featureへ配布する。
6. Historyの数値はunit preferenceに応じて表示変換する。

## Failure and Recovery

profileとIdentityの片方が一時失敗した場合はsection単位で状態を示します。avatar upload失敗時は既存avatarを維持します。設定保存の失敗をlocal表示だけ成功にしません。

## Acceptance

- email変更はIdentityだけを書き換える。
- mile/km変更後、履歴・詳細・集計の全距離表示が追従する。
- passwordless方式のためChange passwordを表示しない。
- phone、location、bio、public sharing、achievement、self-service account deletionを初期画面へ表示しない。
