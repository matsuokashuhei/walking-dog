# Walk Session Frontend Routes

| Route | Responsibility |
| --- | --- |
| `/walk/start` | 犬を選び散歩を開始する |
| `/walk/active/:walkId` | 経過時間、距離、経路、ケアイベントを操作する |
| `/walk/finish/:walkId` | 終了サマリーと任意の感想を保存する |
| `/walk/recover/:walkId` | 中断段階を説明し復旧する |

App Shellはrouteと認証境界だけを担当し、画面状態とmutationはWalk Session frontend moduleが所有します。
