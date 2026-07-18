# Identity & Access Boundary

Profileの作成や表示は行わず、verified UserIdとemail identityだけを公開します。Cognito subject、challenge session、token claimsを他contextへ公開しません。他contextはUserIdの存在・状態をIdentity Directoryで確認します。
