# History & Insights Frontend Routes

| Route | Responsibility |
| --- | --- |
| `/walks` | 利用者の全散歩履歴一覧 |
| `/walks/:walkId` | 散歩詳細 |
| `/dogs/:dogId/walks` | 対象犬の全散歩履歴 |

User Profile画面の生涯・週間集計とDog detailの統計・目標・直近5件は、それぞれのcontext UIがHistory Queriesをcompositionします。History frontend moduleの内部componentを直接importしません。
