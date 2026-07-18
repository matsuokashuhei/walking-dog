# History & Insights Screens

## Walk List

最新順の行に日付、犬名、実行者、距離、時間、pace、pee/poop件数を表示します。Dog detailの「すべて見る」からはDog filter済み一覧へ遷移します。下端で次page、pull-to-refreshで先頭pageを再取得します。

## Walk Detail

route全体が収まる地図、日時、参加犬、実行者、Distance/Time/Pace、終了時感想、時系列event、写真を表示します。地図を利用できなくてもtimelineとmetricsから内容を理解できます。

## Partial Availability

routeや写真だけが失敗した場合はsection単位のretryを出します。必須projectionがmissingなら`incomplete`表示と全体retryを出し、0値として見せません。
