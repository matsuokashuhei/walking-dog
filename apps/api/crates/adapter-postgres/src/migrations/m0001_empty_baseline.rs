use crate::Database;

pub async fn verify_connection(database: &Database) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT 1").execute(&database.pool).await?;
    Ok(())
}

pub async fn apply(database: &Database) -> Result<(), sqlx::Error> {
    let mut transaction = database.pool.begin().await?;
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS _walking_dog_migrations (version BIGINT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    )
    .execute(&mut *transaction)
    .await?;
    sqlx::query(
        "INSERT INTO _walking_dog_migrations (version) VALUES (1) ON CONFLICT (version) DO NOTHING",
    )
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await
}

pub async fn table_names(database: &Database) -> Result<Vec<String>, sqlx::Error> {
    sqlx::query_scalar::<_, String>(
        "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    )
    .fetch_all(&database.pool)
    .await
}
