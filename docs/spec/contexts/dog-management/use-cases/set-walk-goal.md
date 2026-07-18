# Use Case: Set Walk Goal

`DOG-024`: owner UserはDogに日次または週次のminutes goalを設定できます。

new goalはUser timezoneのlocal dateを`effective_from`にします。現在goalを前日で閉じ、new rowを追加します。過去期間を改変しません。HistoryはGoalChanged eventからprojectionを更新します。

`minutes/cycle_days`以外のJSON field、distance、calorie goalを受け付けません。
