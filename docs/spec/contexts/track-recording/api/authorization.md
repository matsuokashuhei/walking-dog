# Track Recording Authorization

- mobile operationには認証済みUserが必要です。
- TrackはWalk Recording AuthorizationでUserが対象Walkの実行者かつWalkが記録可能状態か確認します。
- Historyからのroute参照は、History自身が認可判断せず、end-user identityを伴うTrack queryで再検証します。
- service operationは専用principalと`track:initialize`または`track:finalize`権限を要求します。
- DynamoDB tableへの直接accessを他context、App Shell、mobileへ与えません。
