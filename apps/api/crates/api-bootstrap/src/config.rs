use std::{collections::HashMap, env, net::SocketAddr};

use thiserror::Error;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub api_bind_addr: SocketAddr,
    pub database_url: String,
}

#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum ConfigError {
    #[error("missing required configuration: {0}")]
    Missing(&'static str),
    #[error("API_BIND_ADDR is not a socket address: {0}")]
    InvalidBindAddress(String),
    #[error("DATABASE_URL must be a postgres URL")]
    InvalidDatabaseUrl,
}

impl Config {
    /// Reads and validates process configuration.
    ///
    /// # Errors
    ///
    /// Returns a typed error when a required value is absent or invalid.
    pub fn from_env() -> Result<Self, ConfigError> {
        let values = env::vars().collect();
        Self::from_values(&values)
    }

    /// Validates an explicit configuration map.
    ///
    /// # Errors
    ///
    /// Returns a typed error when a required value is absent or invalid.
    pub fn from_values(values: &HashMap<String, String>) -> Result<Self, ConfigError> {
        let bind = required(values, "API_BIND_ADDR")?;
        let database_url = required(values, "DATABASE_URL")?.to_owned();
        let api_bind_addr = bind
            .parse()
            .map_err(|_| ConfigError::InvalidBindAddress(bind.to_owned()))?;
        if !database_url.starts_with("postgres://") && !database_url.starts_with("postgresql://") {
            return Err(ConfigError::InvalidDatabaseUrl);
        }
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
