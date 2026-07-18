# Track Recording Data Lifecycle

route pointとsummaryは、散歩履歴を再表示できる期間保持します。初期仕様では自動TTLを設定しません。保持期間や利用者削除を導入する際は、法務要件、History表示、event再構築、backupからの復旧を一つのdecisionで定義します。

Point-in-time recoveryと暗号化を有効にします。idempotency itemだけを期限削除する場合は最低30日とし、final summaryとoutboxには適用しません。
