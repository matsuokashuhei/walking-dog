# Walk Session UI States

| State | UI behavior |
| --- | --- |
| `ready` | 犬を選択可能 |
| `starting` | 二重操作を防ぎ開始処理を表示 |
| `active` | 記録操作を有効化 |
| `offline-active` | ローカル蓄積件数と再送状態を表示 |
| `finishing` | Track確定中。終了操作を再送しない |
| `completion-input` | 確定summaryと任意入力を表示 |
| `completed` | 履歴への導線を表示 |
| `recovery-required` | 中断段階と復旧操作を表示 |
| `fatal-error` | 失敗理由と安全な退出先を表示 |

権限拒否、GPS無効、通信断を「距離0」として扱いません。
