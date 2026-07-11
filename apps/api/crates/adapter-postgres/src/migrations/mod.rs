mod m0001_empty_baseline;

pub use m0001_empty_baseline::EmptyBaseline;

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct MigrationContract {
    baseline_applied: bool,
    product_objects: Vec<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MigrationError;

impl MigrationContract {
    #[must_use]
    pub fn fresh() -> Self {
        Self::default()
    }
    #[must_use]
    pub fn product_objects(&self) -> &[String] {
        &self.product_objects
    }
}
