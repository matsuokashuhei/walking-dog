# Walk Session Data Invariants

- 進行中WalkはUserIdごとに最大一件です。
- participantはWalkごとに一件以上かつDogId重複なしです。
- completionはcompleted Walkに一件だけです。
- 完了距離は0以上の整数meter、durationは0以上の整数secondです。
- care eventとphotoの発生・関連付け順序は一意なsequenceで保持します。
- 外部context IDにdatabase foreign keyを作りません。
- lifecycle変更と対応outbox eventを同じtransactionで保存します。
