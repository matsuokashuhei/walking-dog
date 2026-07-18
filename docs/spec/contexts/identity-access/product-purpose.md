# Identity & Access Product Purpose

## Outcomes

- `IDA-001`: Userはemail OTPだけで登録・サインインできます。
- `IDA-002`: Userは有効なrefresh tokenがある限り再認証せず利用を継続できます。
- `IDA-003`: Userは本人確認済みの新emailへ安全に変更できます。
- `IDA-004`: token、OTP、challenge secretをUI以外のlogやanalyticsへ残しません。

## Product Axes

- 犬の体験: 一貫したUserIdに犬との関係を結び付けます。
- データによる散歩の最大化: 再起動やtoken更新後も同じUserの散歩データへ安全に到達します。
- 飼い主の貢献心: password管理を不要にし、再訪時の摩擦を小さくします。
