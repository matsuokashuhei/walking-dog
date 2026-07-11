# 犬編集画面 E2Eテスト項目

犬編集画面 `/dogs/{id}/edit` の現行実装を基準に整理します。

## 1. 取得・初期表示

- 犬詳細のEditから開く
- 読み込み中はLoadingを表示する
- 保存済みName、Breed、Gender、Birthday、Goal、Photoを初期表示する
- 目標なしでは既定の日次30分を表示する
- Cancel、Save、Removeを表示する
- 不正ID、他ユーザーの犬、削除済み犬を表示しない

現状差分：取得エラー・Not Foundの表示がなく、Loadingに留まる可能性があります。

## 2. フォーム編集

- NameとGenderを必須とし、空・空白ではSaveを無効にする
- Name、Breedの前後空白を除去する
- GenderをMale/Female/Otherから選択する
- Birthdayを年のみ、年月、年月日、Unknownで更新する
- 月日依存、うるう年、無効日、未来日を検証する
- Daily/Weeklyと目標minutesを変更し、範囲・step・換算を確認する
- 写真を選択・crop・previewし、権限拒否を表示する
- 既存画像を維持し、選択画像があるときだけmultipart送信する

現状差分：入力最大長、未来日防止、既存画像削除の操作はありません。

## 3. Cancel・保存成功

- Cancelで詳細へ戻り、変更を保存しない
- 未変更でもSaveでき、現在値を送信する
- 保存中はSaveを無効にして二重送信を防ぐ
- 保存成功後に詳細へ戻り、全変更を反映する
- アプリ再起動後も値を維持する
- JSON保存と画像付きmultipart保存を確認する

現状差分：未保存変更確認はなく、Cancelはsubmitting中も明示的に無効化されません。

## 4. 保存失敗

- ネットワーク、timeout、validation、画像upload失敗を表示する
- 失敗後も入力・画像を保持し再試行できる
- 再試行で重複更新しない
- 認証期限切れを安全に処理する

現状差分：updateの`handleSave`にcatch/UIエラー処理がなく、ユーザー向け失敗表示を保証できません。

## 5. Remove

- Removeに犬名を含める
- 押下時に取消不能の確認Dialogを表示する
- Cancelで削除せず編集画面へ戻る
- Remove確定で対象犬IDだけを削除する
- 成功後にDogsタブへreplaceし、一覧から犬が消える
- 失敗時にAlertを表示し、編集画面へ留まる
- active walk参加中、過去履歴あり、複数犬散歩ありの削除ルールを確認する
- 削除操作の連打と成功応答喪失で二重処理しない

## 6. アクセシビリティ・証跡

- Cancel、Save、Change photo、全項目、Remove、確認DialogをVoiceOverで操作する
- Dynamic Type、日本語・英語、Light・Darkを確認する
- 初期値、各編集、写真、保存成功・失敗、削除確認・成功・失敗を画像・動画で保存する
- API、GraphQL、MinIOログと更新前後fixtureを保存する
