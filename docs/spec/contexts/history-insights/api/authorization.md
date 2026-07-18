# History & Insights Authorization

- queryは認証済みUser自身のprojectionだけを返します。
- Dog filterは対象Userが散歩実行者である履歴内のDogIdにだけ作用します。現在Dogがremovedでも過去snapshotは表示できます。
- 他UserのwalkId、dogId、cursorへは存在有無を漏らさない`HISTORY_NOT_FOUND`を返します。
- routeとMedia URLはHistoryが権限を肩代わりせず、各provider契約でUser identityを再検証します。
- rebuild operationはend-user APIへ公開しません。
