# Identity Data Ownership

Identity & AccessはCognito User PoolとPostgreSQL `identity_access` schemaを所有します。Cognitoはchallengeとtokens、PostgreSQLはprovider-independent UserIdとlifecycle event publicationを所有します。

他contextは`user_id`をopaque UUIDとして保存できますが、`identity_access.users`への外部キーやqueryを作りません。
