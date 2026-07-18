# Identity Acceptance Scenarios

- `IDA-A01`: 有効emailでSign Upを開始するとOTP stepへ進み、正しい6桁codeで一つのUserIdとrotating tokensを得る。
- `IDA-A02`: 同じverificationを再送してもUserは増えず同じUserIdを返す。
- `IDA-A03`: 不正、期限切れ、試行超過codeを区別し、tokenを保存しない。
- `IDA-A04`: Sign In成功後、再起動してもsecure storageからsessionを復元する。
- `IDA-A05`: access expiry時、access/refresh両tokenがあるresponseだけを保存する。
- `IDA-A06`: refresh失敗時、保存tokenを削除してloginへ戻す。
- `IDA-A07`: Email Change完了後、新emailだけでSign Inでき、UserIdは変わらない。
- `IDA-A08`: OTP request連打でemailを重複送信しない。
- `IDA-A09`: Cognito/JWKS停止時、provider unavailableを表示して入力を保持する。
- `IDA-A10`: token、OTP、challenge、full emailをapplication logへ出さない。
- `IDA-A11`: authenticated Userがauth routeを開くとWalk tabへ一度だけreplaceする。
- `IDA-A12`: TermsとPrivacyを開けない場合もcrashせず、auth formへ戻れる。

