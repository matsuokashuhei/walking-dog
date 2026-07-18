# Use Case: View Profile

`USR-020`: authenticated UserはMe surfaceでProfile、Identity email、History summaryを確認できます。

User Profile Queriesはprofileとpreferencesだけを返します。frontend compositionは`myIdentity`とHistory Queriesを並行取得し、各sectionのloading/errorを独立表示します。History失敗を0 walksとして表示せず、Identity失敗を空emailとして表示しません。

