# History & Insights Data Invariants

- completed Walkだけがhistory itemを持ちます。
- WalkIdごとのhistory itemは一件で、再配信eventは二重集計しません。
- User/Dog totalsはhistory itemの合計と一致します。
- distance/duration/countは非負です。
- projection generationの切替前に件数、合計、event gapを検証します。
- missing eventや未知versionを0値として取り込みません。
- source contextへのforeign keyとwrite-backを作りません。
