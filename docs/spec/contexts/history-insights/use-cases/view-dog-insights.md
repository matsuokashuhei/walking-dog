# View Dog Insights

Dog insightsは対象犬を含む完了Walkだけを集計し、生涯walk count、distance、duration、直近5件と現在のgoal progressを返します。

Goal progressはDogWalkGoalChanged snapshotの有効期間に従います。`cycleDays=1`は利用者timezoneの当日、`cycleDays=7`は月曜開始の当週のduration minutesを使います。進捗率は表示用に100%で上限表示しますが、実績minutes自体は超過分を保持します。

有効goalがない場合は`goal=null`です。既定目標を暗黙に作りません。projection不完全時は誤った0%を返しません。
