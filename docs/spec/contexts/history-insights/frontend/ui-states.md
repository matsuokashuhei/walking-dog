# History & Insights UI States

| State | Behavior |
| --- | --- |
| `loading` | skeletonを表示し、空状態を確定しない |
| `ready` | dataとfreshnessを表示 |
| `empty` | 成功応答で0件のときだけ表示 |
| `refreshing` | 既存dataを保持して更新 |
| `loading-next` | 既存一覧を保持してfooter表示 |
| `page-error` | 既存一覧を保持し次pageだけ再試行 |
| `error` | 内部詳細を出さず全体retryを表示 |
| `not-found` | 不正ID、存在しないID、閲覧不可を情報漏洩なく表示 |
| `incomplete` | 欠損箇所と更新待ちを明示し0へ代替しない |

日付、距離、時間、イベント数はVoiceOverで一つの意味ある行として読み上げます。グラフは各日の値と「今日」をtextでも伝え、色だけに依存しません。
