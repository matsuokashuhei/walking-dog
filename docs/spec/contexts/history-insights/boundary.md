# History & Insights Boundary

projectionはsource eventsから再構築できます。source contextへwrite-backせず、欠損eventは誤った0値に変換しません。stale/incomplete状態をquery contractで明示します。
