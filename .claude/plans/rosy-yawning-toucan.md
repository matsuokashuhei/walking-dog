# Fix: sign_up 時に display_name が DB に保存されない

## Context

ユーザーがアカウント作成（signUp）する際、`display_name` は Cognito に "name" 属性として保存されるが、PostgreSQL の `users` テーブルには保存されない。DB のユーザーレコードは認証済みリクエスト時に `get_or_create_user(db, cognito_sub)` で遅延作成されるが、この関数は `cognito_sub` のみ受け取り `display_name` を設定しない。

## 方針: sign_up mutation 内で DB レコードを即時作成する

Cognito の `sign_up` レスポンスには `user_sub`（Cognito が割り当てた UUID）が含まれる。これを利用して、sign_up mutation 内で `display_name` 付きの DB レコードを作成する。

**この方針のメリット:**
- `get_or_create_user` の 24 箇所の呼び出しを変更不要
- Cognito への追加リクエスト不要
- インフラ変更不要

## 実装ステップ

### Step 1: `SignUpResult` に `user_sub` を追加

**File**: `apps/api/src/auth/service.rs` (lines 4-6)

```rust
pub struct SignUpResult {
    pub user_confirmed: bool,
    pub user_sub: String,       // ← 追加
}
```

`sign_up()` 関数（line 55-57）で Cognito レスポンスから `user_sub` を抽出:

```rust
Ok(SignUpResult {
    user_confirmed: result.user_confirmed,
    user_sub: result.user_sub().unwrap_or_default().to_string(),
})
```

### Step 2: `create_user_with_profile` 関数を追加

**File**: `apps/api/src/services/user_service.rs`

既存の `get_or_create_user` を変更せず、`display_name` 付きでユーザーを作成する新関数を追加:

```rust
pub async fn create_user_with_profile(
    db: &sea_orm::DatabaseConnection,
    cognito_sub: &str,
    display_name: &str,
) -> Result<UserModel, AppError> {
    if let Some(model) = UserEntity::find()
        .filter(users::Column::CognitoSub.eq(cognito_sub))
        .one(db)
        .await?
    {
        return Ok(model);
    }

    let result = ActiveModel {
        id: Set(Uuid::new_v4()),
        cognito_sub: Set(cognito_sub.to_string()),
        display_name: Set(Some(display_name.to_string())),
        ..Default::default()
    }
    .insert(db)
    .await;

    match result {
        Ok(model) => Ok(model),
        Err(sea_orm::DbErr::Query(ref err))
            if err.to_string().contains("duplicate key") =>
        {
            let model = UserEntity::find()
                .filter(users::Column::CognitoSub.eq(cognito_sub))
                .one(db)
                .await?
                .ok_or_else(|| AppError::Internal(
                    "User disappeared after insert conflict".to_string(),
                ))?;
            Ok(model)
        }
        Err(e) => Err(AppError::Database(e)),
    }
}
```

### Step 3: sign_up mutation で DB レコードを作成

**File**: `apps/api/src/graphql/custom_mutations.rs` (sign_up_field, line 761-787)

Cognito sign_up 成功後に `create_user_with_profile` を呼び出す:

```rust
let result = auth::service::sign_up(...).await.map_err(...)?;

// DB ユーザーレコードを display_name 付きで即時作成
if !result.user_sub.is_empty() {
    if let Err(e) = user_service::create_user_with_profile(
        &state.db,
        &result.user_sub,
        &display_name,
    ).await {
        tracing::warn!(
            "Failed to create user record during sign-up: {}",
            e
        );
    }
}
```

DB 作成失敗は非致命的エラーとして扱う（Cognito 登録は成功済み。後続の `get_or_create_user` がフォールバックとして機能）。

## 修正対象ファイル

| File | Change |
|------|--------|
| `apps/api/src/auth/service.rs` | `SignUpResult` に `user_sub` 追加、`sign_up()` で値を返す |
| `apps/api/src/services/user_service.rs` | `create_user_with_profile()` 関数追加 |
| `apps/api/src/graphql/custom_mutations.rs` | `sign_up_field` で DB レコード作成処理追加 |

## 検証方法

1. `docker compose -f apps/compose.yml run --rm api cargo build` — ビルド成功を確認
2. `docker compose -f apps/compose.yml run --rm api cargo test` — 既存テストが通ることを確認
3. E2E: 新規ユーザーでサインアップ → DB の `users` テーブルで `display_name` が設定されていることを確認

## Edge Cases

- **ユーザーが確認前**: 確認前でも DB レコードが作られるが、認証できないので無害
- **重複 sign_up**: duplicate key ハンドラで既存レコードを返す
- **DB ダウン**: Cognito 登録は成功。DB 作成失敗は警告ログ。後続リクエストで `get_or_create_user` がフォールバック（ただし display_name なし）
