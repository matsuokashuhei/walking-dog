use std::{collections::HashMap, env, net::SocketAddr};

use adapter_postgres::PostgresUrl;
use thiserror::Error;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub api_bind_addr: SocketAddr,
    pub database_url: PostgresUrl,
}

#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum ConfigError {
    #[error("missing required configuration: {0}")]
    Missing(&'static str),
    #[error("API_BIND_ADDR is not a socket address: {0}")]
    InvalidBindAddress(String),
    #[error("DATABASE_URL is not a complete PostgreSQL URL: {0}")]
    InvalidDatabaseUrl(String),
}

impl Config {
    /// Reads and validates process configuration.
    ///
    /// # Errors
    ///
    /// Returns a typed error when a required value is absent or invalid.
    pub fn from_env() -> Result<Self, ConfigError> {
        Self::from_values(&env::vars().collect())
    }

    /// Validates an explicit configuration map.
    ///
    /// # Errors
    ///
    /// Returns a typed error when a required value is absent or invalid.
    pub fn from_values(values: &HashMap<String, String>) -> Result<Self, ConfigError> {
        let bind = required(values, "API_BIND_ADDR")?;
        let database_value = required(values, "DATABASE_URL")?;
        let api_bind_addr = bind
            .parse()
            .map_err(|_| ConfigError::InvalidBindAddress(bind.to_owned()))?;
        let database_url = PostgresUrl::parse(database_value)
            .map_err(|_| ConfigError::InvalidDatabaseUrl("DATABASE_URL".to_owned()))?;
        Ok(Self {
            api_bind_addr,
            database_url,
        })
    }
}

fn required<'a>(
    values: &'a HashMap<String, String>,
    key: &'static str,
) -> Result<&'a str, ConfigError> {
    values
        .get(key)
        .filter(|value| !value.is_empty())
        .map(String::as_str)
        .ok_or(ConfigError::Missing(key))
}
