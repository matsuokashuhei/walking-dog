#![forbid(unsafe_code)]

pub mod migrations;

use std::fmt;

use sqlx::PgPool;
use thiserror::Error;
use url::Url;

#[derive(Clone, Eq, PartialEq)]
pub struct PostgresUrl(Url);

#[derive(Clone, Debug, Error, Eq, PartialEq)]
#[error("invalid PostgreSQL URL")]
pub struct PostgresUrlError;

impl PostgresUrl {
    /// Parses a complete Postgres connection URL.
    ///
    /// # Errors
    ///
    /// Returns an error for malformed URLs, non-PostgreSQL schemes, missing hosts,
    /// or missing database names.
    pub fn parse(value: &str) -> Result<Self, PostgresUrlError> {
        let parsed = Url::parse(value).map_err(|_| PostgresUrlError)?;
        let valid_scheme = matches!(parsed.scheme(), "postgres" | "postgresql");
        let has_host = parsed.host_str().is_some_and(|host| !host.is_empty());
        let has_database = parsed
            .path()
            .trim_matches('/')
            .split('/')
            .next()
            .is_some_and(|name| !name.is_empty());
        if !valid_scheme || !has_host || !has_database {
            return Err(PostgresUrlError);
        }
        Ok(Self(parsed))
    }

    pub(crate) fn expose(&self) -> &str {
        self.0.as_str()
    }
}

impl fmt::Debug for PostgresUrl {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("PostgresUrl([REDACTED])")
    }
}

#[derive(Clone, Debug)]
pub struct Database {
    pub(crate) pool: PgPool,
}

impl Database {
    /// Connects to Postgres and verifies the connection.
    ///
    /// # Errors
    ///
    /// Returns a database error when the pool cannot connect or answer a verification query.
    pub async fn connect(url: &PostgresUrl) -> Result<Self, sqlx::Error> {
        let pool = PgPool::connect(url.expose()).await?;
        let database = Self { pool };
        migrations::verify_connection(&database).await?;
        Ok(database)
    }

    /// Verifies that Postgres accepts queries.
    ///
    /// # Errors
    ///
    /// Returns a database error when the verification query fails.
    pub async fn verify(&self) -> Result<(), sqlx::Error> {
        migrations::verify_connection(self).await
    }
}
