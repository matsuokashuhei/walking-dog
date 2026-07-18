# Use Case: Update Preferences

`USR-022`: Userはlocale、units、appearance、notificationsを個別またはまとめて更新できます。

updateはexpected versionで競合検出し、`UserPreferencesUpdated v1`へ変更後snapshotを含めます。units変更は保存済みdistanceを変換せず、表示時のformatだけを変えます。appearance `system`はOS settingを追従します。

Notificationsの実配信permissionとchannel管理はplatform capabilityです。このcontextはUserの希望だけを保存します。

