# Read Route

認証済みのWalk実行者はsequence昇順のpoint pageを取得できます。応答はpointの座標、時刻、精度、source、`acceptedForDistance`、`rejectionReason`とnext cursorを含みます。

active Walk向けにはaccepted pointだけを結んだ暫定routeと距離を返せます。画面は除外pointを経路線へ含めません。履歴向けrouteも同じ正本から読み、HistoryのDBへraw pointを複製しません。
