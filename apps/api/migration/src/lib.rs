pub use sea_orm_migration::prelude::*;

mod m20260321_000001_create_users;
mod m20260321_000002_create_dogs;
mod m20260321_000003_create_walks;
mod m20260321_000004_create_walk_dogs;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260321_000001_create_users::Migration),
            Box::new(m20260321_000002_create_dogs::Migration),
            Box::new(m20260321_000003_create_walks::Migration),
            Box::new(m20260321_000004_create_walk_dogs::Migration),
        ]
    }
}
