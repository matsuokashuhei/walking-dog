# Identity Authorization

- OTP request/verificationはunauthenticatedで利用できます。
- Email change、sign-outは有効なaccess tokenのUserId本人だけが実行できます。
- Refreshはrefresh tokenが示すUserだけを更新します。input UserIdを受け取りません。
- Directory queryはservice identityだけが呼び、end-user GraphQLへ直接公開しません。
- `myIdentity`はaccess token本人だけが呼び、現在emailを他Userへ公開しません。
- provider claimsを信用する前にissuer、audience、signature、expiry、token useを検証します。
