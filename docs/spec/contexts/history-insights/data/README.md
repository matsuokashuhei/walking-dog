# History & Insights Data

PostgreSQLの`history_insights` schemaに、eventから作るread model、consumer deduplication、checkpoint、generationを保存します。このschemaは履歴query用で、Walk/Dog/Userの正本を変更しません。

raw GPS、Media object、認証情報は保存しません。Walkのsnapshot IDとmetricsだけを投影します。
