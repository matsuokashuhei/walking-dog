# PLT-002 Security and Privacy

## Authentication and Authorization

- Cognito User Poolは論理名`users`、物理名`walking-dog-{environment}-users`です。
- end-user operationはaccess tokenを検証し、各contextがresource authorizationを実施します。
- service identityは最小権限のcontext別principalを使い、end-user tokenを横流ししません。
- database principal、schema、object prefix、queue accessをcontext単位で分離します。

## Sensitive Data

OTP、access/refresh token、Authorization header、署名付きURL、正確なGPS座標、email、内部provider responseをapplication log、analytics、crash reportへ残しません。診断用routeは座標を丸め、利用者と時間範囲を限定します。

## Storage and Transport

通信はTLS、PostgreSQL/DynamoDB/object storage/backupは保存時暗号化を必須にします。mobile tokenと進行中Walk queueはOSの保護領域を使います。Mediaはchecksum、content sniffing、metadata除去後だけreadyになります。

## Abuse and Privacy

OTP、upload、queryにはUser/IPを考慮したrate limitを設けます。他User IDへのaccessは存在確認を漏らしません。詳細位置情報と写真の共有は初期scope外で、public URLを発行しません。
