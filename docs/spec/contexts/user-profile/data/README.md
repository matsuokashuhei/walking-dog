# User Profile Data Ownership

PostgreSQL `user_profile` schemaはprofileとpreferencesを所有します。UserId、MediaAssetIdは外部参照でありforeign keyを作りません。emailとwalk metricsを保存しません。

