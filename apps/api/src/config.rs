use std::{collections::HashMap, env};

use tracing_subscriber::EnvFilter;

const SQL_BIND_LOG_ENV: &str = "API_SQL_BIND_LOG";
const RUST_LOG_ENV: &str = "RUST_LOG";
const DEFAULT_FILTER_DIRECTIVES: &str = "info";
const SQL_BIND_FILTER_DIRECTIVES: &str = "info,sea_orm=debug,sqlx::query=off";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DatabaseLogConfig {
    SqlxDefault,
    SqlBindValues,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApiLogConfig {
    sql_bind_logging_enabled: bool,
    filter_directives: String,
}

impl ApiLogConfig {
    pub fn from_env() -> Self {
        Self::from_env_vars(env::vars().collect::<HashMap<_, _>>())
    }

    pub fn from_env_vars(vars: HashMap<String, String>) -> Self {
        let sql_bind_logging_enabled = vars.get(SQL_BIND_LOG_ENV).is_some_and(|value| value == "1");
        let filter_directives = if sql_bind_logging_enabled {
            vars.get(RUST_LOG_ENV)
                .filter(|value| !value.is_empty())
                .cloned()
                .unwrap_or_else(|| SQL_BIND_FILTER_DIRECTIVES.to_owned())
        } else {
            DEFAULT_FILTER_DIRECTIVES.to_owned()
        };

        Self {
            sql_bind_logging_enabled,
            filter_directives,
        }
    }

    pub fn sql_bind_logging_enabled(&self) -> bool {
        self.sql_bind_logging_enabled
    }

    pub fn database_log_config(&self) -> DatabaseLogConfig {
        if self.sql_bind_logging_enabled {
            DatabaseLogConfig::SqlBindValues
        } else {
            DatabaseLogConfig::SqlxDefault
        }
    }

    pub fn filter_directives(&self) -> &str {
        &self.filter_directives
    }

    fn env_filter(&self) -> anyhow::Result<EnvFilter> {
        Ok(EnvFilter::try_new(self.filter_directives())?)
    }
}

pub fn init_tracing(config: &ApiLogConfig) -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(config.env_filter()?)
        .try_init()
        .map_err(|error| anyhow::anyhow!("failed to initialize tracing subscriber: {error}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;

    #[test]
    fn default_log_config_keeps_bind_sql_logging_disabled() {
        let config = ApiLogConfig::from_env_vars(HashMap::<String, String>::new());

        assert!(!config.sql_bind_logging_enabled());
        assert_eq!(config.database_log_config(), DatabaseLogConfig::SqlxDefault);
        assert_eq!(config.filter_directives(), "info");
    }

    #[test]
    fn dedicated_opt_in_enables_sea_orm_bind_sql_and_disables_sqlx_query_logs() {
        let config = ApiLogConfig::from_env_vars(HashMap::from([(
            "API_SQL_BIND_LOG".to_owned(),
            "1".to_owned(),
        )]));

        assert!(config.sql_bind_logging_enabled());
        assert_eq!(
            config.database_log_config(),
            DatabaseLogConfig::SqlBindValues
        );
        assert_eq!(
            config.filter_directives(),
            "info,sea_orm=debug,sqlx::query=off"
        );
    }

    #[test]
    fn rust_log_cannot_enable_bind_sql_without_dedicated_opt_in() {
        let config = ApiLogConfig::from_env_vars(HashMap::from([(
            "RUST_LOG".to_owned(),
            "sea_orm=debug".to_owned(),
        )]));

        assert!(!config.sql_bind_logging_enabled());
        assert_eq!(config.database_log_config(), DatabaseLogConfig::SqlxDefault);
        assert_eq!(config.filter_directives(), "info");
    }

    #[test]
    fn rust_log_is_respected_after_dedicated_opt_in() {
        let config = ApiLogConfig::from_env_vars(HashMap::from([
            ("API_SQL_BIND_LOG".to_owned(), "1".to_owned()),
            (
                "RUST_LOG".to_owned(),
                "info,walking_dog=debug,sea_orm=debug,sqlx::query=off".to_owned(),
            ),
        ]));

        assert!(config.sql_bind_logging_enabled());
        assert_eq!(
            config.filter_directives(),
            "info,walking_dog=debug,sea_orm=debug,sqlx::query=off"
        );
    }

    #[test]
    fn invalid_or_empty_bind_log_values_are_disabled() {
        for value in ["", "true", "0", "yes", "debug"] {
            let config = ApiLogConfig::from_env_vars(HashMap::from([(
                "API_SQL_BIND_LOG".to_owned(),
                value.to_owned(),
            )]));

            assert!(
                !config.sql_bind_logging_enabled(),
                "value {value:?} should not enable bind SQL logging"
            );
            assert_eq!(config.filter_directives(), "info");
        }
    }
}
