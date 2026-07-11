mod m0001_empty_baseline;

use crate::Database;

pub struct Migrator;

impl Migrator {
    /// Applies the persistent empty baseline exactly once.
    ///
    /// # Errors
    ///
    /// Returns a database error when Postgres cannot create or update the ledger.
    pub async fn up(database: &Database) -> Result<(), sqlx::Error> {
        m0001_empty_baseline::apply(database).await
    }

    /// Lists application-owned tables for integration verification.
    ///
    /// # Errors
    ///
    /// Returns a database error when Postgres cannot inspect its catalog.
    pub async fn table_names(database: &Database) -> Result<Vec<String>, sqlx::Error> {
        m0001_empty_baseline::table_names(database).await
    }
}

pub(crate) async fn verify_connection(database: &Database) -> Result<(), sqlx::Error> {
    m0001_empty_baseline::verify_connection(database).await
}
