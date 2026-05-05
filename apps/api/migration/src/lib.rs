pub use sea_orm_migration::prelude::*;

mod m20260502_115153_create_caretakers;
mod m20260502_151110_create_dogs;
mod m20260502_155738_create_caretakers_dogs;
mod m20260502_155745_create_walks;
mod m20260502_155756_create_walk_dogs;
mod m20260502_155759_create_walk_photos;
mod m20260502_155803_create_walk_events;
mod m20260503_052813_create_track_points;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260502_115153_create_caretakers::Migration),
            Box::new(m20260502_151110_create_dogs::Migration),
            Box::new(m20260502_155738_create_caretakers_dogs::Migration),
            Box::new(m20260502_155745_create_walks::Migration),
            Box::new(m20260502_155756_create_walk_dogs::Migration),
            Box::new(m20260502_155759_create_walk_photos::Migration),
            Box::new(m20260502_155803_create_walk_events::Migration),
            Box::new(m20260503_052813_create_track_points::Migration),
        ]
    }
}
