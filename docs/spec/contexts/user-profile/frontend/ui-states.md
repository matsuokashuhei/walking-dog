# User Profile UI States

| State | Behavior |
| --- | --- |
| loading | profile skeleton、summary section独立loading |
| ready | profileと利用可能なexternal sectionsを表示 |
| profile-error | profile errorとRetry、古い値を0/空へ変換しない |
| history-error | profileを維持しsummary sectionだけRetry |
| editing | dirty stateを追跡、変更なしSave disabled |
| uploading-avatar | previewとprogress、Save disabled |
| submitting | form操作を無効化 |
| conflict | reload/merge choice、上書きしない |
| saved | Meへreplaceし最新versionを表示 |

Dynamic Type最大時もSave、Cancel、Settings rowsへscroll到達できます。Avatarにはdisplay nameを含むaccessibility labelを付けます。
