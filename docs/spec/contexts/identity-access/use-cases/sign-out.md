# Use Case: Sign Out

## Requirement

`IDA-024`: Userは現在deviceのsessionを失効させ、local tokenを残さずSign Inへ戻れます。

clientはserver revokeを要求し、結果にかかわらずlocal secure storageを削除します。network failureはlocal sign-outを妨げませんが、server revocation pendingをdiagnosticとして記録します。token値は記録しません。

全device sign-outとaccount deletionは初期scope外です。disabled Userは管理processから`UserDisabled v1`を発行します。

