# Walk Session Authorization

- 認証済みUserだけが操作できます。
- Userは自分が実行者のWalkだけを取得・変更できます。
- 開始時、全participantについてDog Directoryの`owner`または`walker`権限が必要です。
- 写真AssetはMedia Catalog上で同じUserが所有し、purposeが`walk_photo`、statusが`ready`である必要があります。
- service間呼び出しは専用principalと契約単位の権限を使い、end-user tokenを横流ししません。
