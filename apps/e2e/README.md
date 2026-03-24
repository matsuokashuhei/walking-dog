# E2E Tests

## Mobile UI テストケース一覧

Playwright ブラウザ経由で React Native (Expo Web) の画面を操作するテスト。
実行方法:

```bash
# 全ロケール (ja-JP + en-US)
docker compose -f apps/compose.yml --profile e2e run --rm e2e npx playwright test --project "iPhone 14 - ja-JP" --project "iPhone 14 - en-US"
```

### smoke.spec.ts — スモーク (1件)

| # | テストケース名 | Given | When | Then |
|---|---------------|-------|------|------|
| 1 | `Expo web app loads` | なし | トップページ `/` にアクセスする | ページタイトルが存在する |

### auth.spec.ts — 認証フロー (11件)

| # | テストケース名 | Given | When | Then |
|---|---------------|-------|------|------|
| 2 | `Sign Up: happy path — registers a new user` | ログイン画面が表示されている | 新規メールで登録フォームを送信し、確認コードを入力する | ログイン画面にリダイレクトされる |
| 3 | `Sign Up: shows inline error when password is too short` | 登録画面が表示されている | パスワードに "short" を入力する | パスワードエラーが表示され、送信ボタンが無効になる |
| 4 | `Sign Up: shows error for duplicate email` | 既にユーザー登録済みのメールがある | 同じメールで再度登録フォームを送信する | 重複メールエラーが表示される |
| 5 | `Confirm Sign Up: enters real confirmation code and redirects to login` | 新規ユーザーを登録済み | cognito-local DB の確認コードを入力する | ログイン画面にリダイレクトされる |
| 6 | `Confirm Sign Up: shows error for invalid code` | 登録画面で新規ユーザーを作成し確認コード入力画面が表示されている | 無効なコード "000000" を入力する | 無効なコードエラーが表示される |
| 7 | `Sign In: existing user can log in` | ユーザー登録・確認済み | 正しいメール・パスワードでログインする | タブ画面にリダイレクトされる |
| 8 | `Sign In: shows error for wrong password` | ユーザー登録・確認済み | 間違ったパスワードでログインする | 認証エラーが表示される |
| 9 | `Sign In: shows error for non-existent user` | ログイン画面が表示されている | 存在しないメールでログインする | 認証エラーが表示される |
| 10 | `Sign Out: after login, signing out returns to login screen` | ログイン済みで設定画面を表示 | サインアウトボタン→確認ダイアログでサインアウトする | ログイン画面に戻る |
| 11 | `Navigation guard: unauthenticated user is redirected to login` | 未ログイン状態 | `/(tabs)` に直接アクセスする | ログイン画面にリダイレクトされる |
| 12 | `Full flow: register, login, and logout` | ログイン画面が表示されている | 登録→ログイン→設定画面でサインアウトする | 各ステップで正しい画面が表示され、最終的にログイン画面に戻る |

### dogs.spec.ts — 犬プロフィール CRUD (11件)

| # | テストケース名 | Given | When | Then |
|---|---------------|-------|------|------|
| 13 | `Dogs tab: shows empty state when no dogs exist` | ログイン済みで犬が未登録 | 犬タブに移動する | 空状態メッセージと追加ボタンが表示される |
| 14 | `Dogs tab: FAB navigates to create screen` | ログイン済みで犬タブを表示 | 追加ボタンをクリックする | 犬の新規登録画面が表示される |
| 15 | `Create dog: registers a new dog and redirects to detail` | 犬の新規登録画面を表示 | 名前 "ポチ"、犬種 "柴犬" を入力して登録する | 犬の詳細画面に "ポチ" と "柴犬" が表示される |
| 16 | `Create dog: submit is disabled when name is empty` | 犬の新規登録画面を表示 | 名前を空のまま犬種だけ入力する | 登録ボタンが無効。名前を入力すると有効になる |
| 17 | `Dog list: created dog appears in the list` | 犬 "ハナ"（プードル）を登録済み | 犬タブに移動する | リストに "ハナ" と "プードル" が表示される |
| 18 | `Dog detail: shows name, breed, and stats (0 walks)` | 犬 "クロ"（ラブラドール）を登録済み | 詳細画面を表示する | 名前、犬種、散歩統計（回数・距離・時間）、編集・削除ボタンが表示される |
| 19 | `Edit dog: updates dog name and breed` | 犬 "シロ" を登録済みで詳細画面を表示 | 編集ボタン→名前を "シロ改"、犬種を "秋田犬" に変更して更新する | 詳細画面に "シロ改" と "秋田犬" が表示される |
| 20 | `Delete dog: removes dog and redirects to list` | 犬 "タロウ" を登録済みで詳細画面を表示 | 削除ボタン→確認ダイアログで削除する | 犬リストの空状態画面にリダイレクトされる |
| 21 | `Delete dog: cancelling keeps the dog` | 犬 "モモ" を登録済みで詳細画面を表示 | 削除ボタン→確認ダイアログでキャンセルする | "モモ" がそのまま表示されている |
| 22 | `Full flow: create, view, edit, delete a dog` | ログイン済み | 犬 "フルフロー犬" を登録→詳細確認→名前を "フルフロー犬（更新）" に編集→削除する | 各ステップで正しい画面が表示され、最終的に空状態に戻る |

### settings.spec.ts — 設定 (6件)

| # | テストケース名 | Given | When | Then |
|---|---------------|-------|------|------|
| 23 | `Settings tab: shows profile section with display name` | ログイン済みで設定画面を表示 | プロフィールセクションを確認する | タイトル、プロフィール、表示名、編集ボタンが表示される |
| 24 | `Settings tab: shows dog list section` | ログイン済みで設定画面を表示 | 犬リストセクションを確認する | 犬セクションと「犬がいません」メッセージが表示される |
| 25 | `Settings tab: shows appearance section` | ログイン済みで設定画面を表示 | 外観セクションを確認する | 外観セクションが表示される |
| 26 | `Settings tab: shows sign out button` | ログイン済みで設定画面を表示 | サインアウトボタンを確認する | サインアウトボタンが表示される |
| 27 | `Settings tab: sign out shows confirmation dialog` | ログイン済みで設定画面を表示 | サインアウトボタンをクリックし、確認ダイアログでキャンセルする | 確認ダイアログが表示され、キャンセル後は設定画面に戻る |
| 28 | `Settings tab: shows version number` | ログイン済みで設定画面を表示 | バージョン表示を確認する | "Version" または "バージョン" が表示される |

---

## GraphQL API テストケース一覧

Playwright の `APIRequestContext` で `/graphql` に直接 HTTP POST するテスト。
実行方法:

```bash
docker compose -f apps/compose.yml --profile e2e run --rm e2e npx playwright test --project API
```

### auth.spec.ts — 認証 (9件)

| # | テストケース名 | Given | When | Then |
|---|---------------|-------|------|------|
| 29 | `signUp > registers a new user successfully` | 未登録のメールアドレスがある | signUp ミューテーションを実行する | `success: true`, `userConfirmed: false` が返る |
| 30 | `confirmSignUp > confirms a user with valid code` | signUp 済みのユーザーがいる | cognito-local DB から取得した正しい確認コードで confirmSignUp を実行する | `true` が返る |
| 31 | `confirmSignUp > rejects invalid code` | signUp 済みのユーザーがいる | 無効なコード "000000" で confirmSignUp を実行する | `errors` が返る |
| 32 | `signIn > returns tokens for confirmed user` | signUp + confirmSignUp 済みのユーザーがいる | 正しいメール・パスワードで signIn を実行する | `accessToken` と `refreshToken` が返る |
| 33 | `signIn > rejects wrong password` | signUp + confirmSignUp 済みのユーザーがいる | 間違ったパスワードで signIn を実行する | `errors` が返る |
| 34 | `signIn > rejects non-existent user` | 存在しないメールアドレスがある | そのメールで signIn を実行する | `errors` が返る |
| 35 | `signOut > invalidates the access token` | signIn 済みで accessToken を持っている | その accessToken で signOut を実行する | `true` が返る |
| 36 | `me > returns user after sign in` | registerAndSignIn で認証済みクライアントがある | me クエリーを実行する | `id`, `cognitoSub`, `createdAt` が返り、`dogs` は空配列 |
| 37 | `me > returns Unauthorized without token` | 未認証のクライアントがある | me クエリーを実行する | `errors` に "Unauthorized" が含まれる |

### dogs.spec.ts — 犬 CRUD (11件)

| # | テストケース名 | Given | When | Then |
|---|---------------|-------|------|------|
| 38 | `createDog > creates a dog with name only` | 認証済みクライアントがある | name のみ指定で createDog を実行する | `id`, `name` が返り、`breed` は `null` |
| 39 | `createDog > creates a dog with all fields` | 認証済みクライアントがある | name, breed, gender, birthDate を全て指定で createDog を実行する | 全フィールドが指定値で返る |
| 40 | `createDog > rejects without authentication` | 未認証のクライアントがある | createDog を実行する | `errors` に "Unauthorized" が含まれる |
| 41 | `dog query > returns a created dog by ID` | 犬を1匹作成済み | その犬の ID で dog クエリーを実行する | 作成時と同じ `name`, `breed` が返る |
| 42 | `dog query > returns null for non-existent dog` | 認証済みクライアントがある | 存在しない UUID で dog クエリーを実行する | `data.dog` が `null` |
| 43 | `updateDog > updates dog name and breed` | 犬を1匹作成済み | 新しい name と breed で updateDog を実行する | 更新後の `name`, `breed` が返る |
| 44 | `updateDog > rejects update for another user's dog` | ユーザーAが犬を作成済み、ユーザーBが認証済み | ユーザーBがユーザーAの犬を updateDog する | `errors` が返る |
| 45 | `deleteDog > deletes a dog` | 犬を1匹作成済み | deleteDog を実行し、その後 dog クエリーで確認する | `true` が返り、再取得で `null` |
| 46 | `deleteDog > rejects deletion of non-existent dog` | 認証済みクライアントがある | 存在しない UUID で deleteDog を実行する | `errors` が返る |
| 47 | `deleteDog > rejects deletion of another user's dog` | ユーザーAが犬を作成済み、ユーザーBが認証済み | ユーザーBがユーザーAの犬を deleteDog する | `errors` が返り、犬はユーザーAの元に残っている |
| 48 | `me.dogs > returns list of user's dogs` | 犬を2匹作成済み | me クエリーで dogs を取得する | `dogs` の長さが 2、名前が一致する |

### walks.spec.ts — 散歩ライフサイクル (10件)

| # | テストケース名 | Given | When | Then |
|---|---------------|-------|------|------|
| 49 | `startWalk > starts a walk with one dog` | 犬を1匹作成済み | dogIds に1つの ID で startWalk を実行する | `status: "active"`, `startedAt` あり, `endedAt: null`, `dogs` 1匹 |
| 50 | `startWalk > starts a walk with multiple dogs` | 犬を2匹作成済み | dogIds に2つの ID で startWalk を実行する | `data.startWalk.dogs` が2要素の配列。各要素は `{ id, name }` 構造。散歩自体は `status: "active"`, `distanceM: null`, `durationSec: null`, `endedAt: null` |
| 51 | `startWalk > rejects without dog IDs` | 認証済みクライアントがある | 空配列で startWalk を実行する | `errors` が返る |
| 52 | `finishWalk > finishes an active walk` | 散歩を開始済み (status: active) | finishWalk を実行する | `status: "finished"`, `endedAt` あり, `durationSec >= 0` |
| 53 | `finishWalk > accepts optional distanceM` | 散歩を開始済み | `distanceM: 1500` で finishWalk を実行する | `distanceM: 1500` が返る |
| 54 | `addWalkPoints > adds GPS points to a walk` | 散歩を開始済み | 3つの GPS ポイントで addWalkPoints を実行する | `true` が返る |
| 55 | `addWalkPoints > rejects for another user's walk` | ユーザーAが散歩を開始済み、ユーザーBが認証済み | ユーザーBがユーザーAの散歩に addWalkPoints する | `errors` が返る |
| 56 | `walk query > returns walk by ID with dogs and points` | 散歩を開始→ポイント追加→終了済み | walk クエリーで ID 指定で取得する | `status: "finished"`, `distanceM: 500`, `dogs` 1匹, `points` 1件 |
| 57 | `myWalks > returns list of user's walks` | 同じ犬で散歩を2回開始済み | myWalks クエリーを実行する | 長さが 2 以上 |
| 58 | `myWalks > supports pagination with limit/offset` | 同じ犬で散歩を3回開始済み | `limit: 2, offset: 0` で myWalks を実行する | 長さが 2 |

### queries.spec.ts — クエリー (6件)

| # | テストケース名 | Given | When | Then |
|---|---------------|-------|------|------|
| 59 | `dogWalkStats > returns zero stats for new dog` | 犬を1匹作成済み (散歩なし) | `period: "ALL"` で dogWalkStats を実行する | `totalWalks: 0`, `totalDistanceM: 0`, `totalDurationSec: 0` |
| 60 | `dogWalkStats > returns correct stats after walks` | 犬を作成し、散歩を開始→`distanceM: 1000` で終了済み | `period: "ALL"` で dogWalkStats を実行する | `totalWalks: 1`, `totalDistanceM: 1000`, `totalDurationSec >= 0` |
| 61 | `dogWalkStats > rejects for non-existent dog` | 認証済みクライアントがある | 存在しない UUID で dogWalkStats を実行する | `errors` に "Dog not found" が含まれる |
| 62 | `walkPoints > returns empty array for walk with no points` | 散歩を開始済み (ポイント未追加) | walkPoints クエリーを実行する | 空配列が返る |
| 63 | `walkPoints > returns added points` | 散歩を開始し3つの GPS ポイントを追加済み | walkPoints クエリーを実行する | 長さ 3、`lat` / `lng` / `recordedAt` が正しい |
| 64 | `walkPoints > rejects for non-existent walk` | 認証済みクライアントがある | 存在しない UUID で walkPoints を実行する | `errors` に "Walk not found" が含まれる |

### photo.spec.ts — 写真URL生成 (3件)

| # | テストケース名 | Given | When | Then |
|---|---------------|-------|------|------|
| 65 | `generateDogPhotoUploadUrl > returns presigned URL` | 犬を1匹作成済み | generateDogPhotoUploadUrl を実行する | `url`, `key`, `expiresAt` が全て返る |
| 66 | `generateDogPhotoUploadUrl > rejects for non-existent dog` | 認証済みクライアントがある | 存在しない UUID で実行する | `errors` に "Dog not found" が含まれる |
| 67 | `generateDogPhotoUploadUrl > rejects without authentication` | 未認証のクライアントがある | 実行する | `errors` に "Unauthorized" が含まれる |
