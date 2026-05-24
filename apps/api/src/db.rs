use sea_orm::{ConnectOptions, Database, DatabaseConnection};

use crate::config::DatabaseLogConfig;

pub async fn connect_database_from_env(
    config: DatabaseLogConfig,
) -> anyhow::Result<DatabaseConnection> {
    let database_url = std::env::var("DATABASE_URL")?;
    connect_database(database_url, config).await
}

pub async fn connect_database(
    database_url: impl Into<String>,
    config: DatabaseLogConfig,
) -> anyhow::Result<DatabaseConnection> {
    Ok(Database::connect(build_connect_options(database_url, config)).await?)
}

pub(crate) fn build_connect_options(
    database_url: impl Into<String>,
    config: DatabaseLogConfig,
) -> ConnectOptions {
    let mut options = ConnectOptions::new(database_url.into());
    if config == DatabaseLogConfig::SqlBindValues {
        options.sqlx_logging(false);
    }
    options
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::DatabaseLogConfig;

    #[test]
    fn connect_options_keep_sqlx_logging_by_default() {
        let options = build_connect_options(
            "postgres://postgres:postgres@localhost/walking_dog",
            DatabaseLogConfig::SqlxDefault,
        );

        assert!(options.get_sqlx_logging());
    }

    #[test]
    fn connect_options_disable_sqlx_logging_for_bind_value_logs() {
        let options = build_connect_options(
            "postgres://postgres:postgres@localhost/walking_dog",
            DatabaseLogConfig::SqlBindValues,
        );

        assert!(!options.get_sqlx_logging());
    }
}
