# View Walk Detail

Walk detailは日付、開始・終了時刻、参加犬snapshot、実行者snapshot、距離、時間、pace、気分・天気・タグ・メモ、care event、写真を返します。

経路pointはHistory DBへ複製せず、認可済みUser identityでTrack Recordingのroute queryを呼びます。写真URLはAssetIdごとにMedia Catalogから短命delivery URLを得ます。一方が失敗しても詳細全体を永久loadingにせず、route/photo部分のerrorを明示して他の正本情報を表示します。

距離0ではpaceをnullとします。不正または欠損した必須metricsは0へ置換せず`incomplete`を返します。
