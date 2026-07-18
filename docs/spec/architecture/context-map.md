# Context Map

## Product Contexts

| Context | Owns | Does not own |
| --- | --- | --- |
| Identity & Access | user registration、OTP、authentication、sessions、tokens、email identity | profile presentation、dogs、walks |
| User Profile | display name、profile、preferences | credentials、dog records、walk source records |
| Dog Management | dogs、user-dog roles、dog profile、time-based goals | authentication、walk lifecycle、history aggregation |
| Walk Session | start、participants、events、finish、recovery、lifecycle | GPS persistence、distance algorithm、history projections |
| Track Recording | GPS ingestion、ordering、deduplication、quality filtering、distance finalization | walk authorization、history presentation |
| History & Insights | history、totals、goal progress、weekly metrics、rebuildable read models | source record mutation |
| Media | upload、validation、asset ownership、object persistence、delivery | dog/walk/profile semantic association |

## Dependency Direction

```text
Identity ─┬─> User Profile ─────────────┐
          ├─> Dog Management ───────┐   │
          └─> Media ────────────────┼───┤
                                   v   v
                              Walk Session ─> Track Recording
                                   │                 │
                                   └────────┬────────┘
                                            v
                                  History & Insights
```

矢印は内部コード依存ではなく、提供側が所有する公開契約を利用できる方向です。History & Insightsはsource contextsのイベントからprojectionを構築します。

## App Shell

App Shellは8番目のdomain contextではありません。認証状態の配布、route registration、tab/deep-link composition、theme bootstrapだけを担当し、feature screenやdomain decisionを持ちません。
