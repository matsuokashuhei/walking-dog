# Identity State Machines

## OTP Authentication

```text
email-entry
  -> requesting
  -> challenge-issued
  -> verifying
  -> authenticated

requesting -> request-failed -> email-entry
challenge-issued -> expired -> email-entry
verifying -> invalid-code -> challenge-issued
verifying -> attempts-exhausted -> email-entry
```

同一画面でrequestを連打しても`requesting`中は追加requestを送りません。challenge発行後60秒はresendできません。

## Session Lifecycle

```text
missing -> authenticated -> access-expired -> refreshing -> authenticated
refreshing -> refresh-rejected -> missing
authenticated -> signed-out -> missing
```

refresh responseにaccess tokenまたはrotated refresh tokenが欠けた場合は`refresh-rejected`です。部分的tokenを保存しません。

## Email Change

```text
current-email
  -> new-email-entry
  -> challenge-issued
  -> verifying
  -> updating-provider
  -> updating-directory
  -> completed
```

provider更新後にdirectory更新が一時失敗した場合はoutbox recoveryで再試行し、UIは`completion-pending`を表示します。旧emailへ戻したと偽装しません。

