# Dog Management UI States

| State | Behavior |
| --- | --- |
| loading | empty stateを先に表示しない |
| empty | Dogが0件と確認できた場合だけ表示 |
| error | errorとRetry、emptyと区別 |
| ready | stable card list |
| not-found | unknown/removed/unauthorized detail |
| editing-dirty | Cancel時に破棄確認 |
| uploading-avatar | preview、progress、Save disabled |
| submitting | controls disabled、single request |
| conflict | latest Dog reloadを案内 |
| removed | Dogs tabへreplace、古いdetailへ戻さない |

同名Dogはnameだけでなくbreed/gender/avatarをaccessibility labelへ含めて区別します。

