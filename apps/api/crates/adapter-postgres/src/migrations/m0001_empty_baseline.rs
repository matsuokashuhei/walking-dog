use super::{MigrationContract, MigrationError};

pub struct EmptyBaseline;

impl EmptyBaseline {
    /// Applies the intentionally empty baseline.
    ///
    /// # Errors
    ///
    /// Returns a migration error when the database contract cannot record the baseline.
    pub fn apply(database: &mut MigrationContract) -> Result<(), MigrationError> {
        database.baseline_applied = true;
        Ok(())
    }
}
