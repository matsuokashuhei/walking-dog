# Walk Session Data

PostgreSQLの`walk_session` schemaをこのcontextだけが所有します。UserId、DogId、AssetIdは外部contextの識別子なので外部キーを張りません。Walk内部のparticipant、event、photo、completionだけに内部外部キーを使います。

raw GPS pointとroute geometryは保存しません。確定距離はTrack契約から受領したsnapshotです。
