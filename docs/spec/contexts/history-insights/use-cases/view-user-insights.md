# View User Insights

User insightsは生涯walk count、distanceMeters、durationSeconds、参加したactive dog countと、指定timezoneにおける今週月曜から日曜までの7日分を返します。

- 日別値は同日の全完了Walkを合算します。
- future completedAtのeventは集計せずprojection warningにします。
- timezoneはIANA identifierを使い、夏時間を考慮します。
- 単位変換と表示丸めはfrontendで行い、queryはmeter/secondを返します。
- 週内が0件でも7日分のbucketを返します。
