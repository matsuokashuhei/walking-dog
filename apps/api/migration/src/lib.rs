pub use sea_orm_migration::prelude::*;

mod m20260502_115153_create_user;
mod m20260502_151110_create_dog;
mod m20260502_155738_create_user_dog;
mod m20260502_155745_create_walk;
mod m20260502_155756_create_walk_dog;
mod m20260502_155759_create_walk_photo;
mod m20260502_155803_create_walk_dog_event;
mod m20260503_052813_create_track_point;
mod m20260510_000000_add_birthday_to_dog;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260502_115153_create_user::Migration),
            Box::new(m20260502_151110_create_dog::Migration),
            Box::new(m20260502_155738_create_user_dog::Migration),
            Box::new(m20260502_155745_create_walk::Migration),
            Box::new(m20260502_155756_create_walk_dog::Migration),
            Box::new(m20260502_155759_create_walk_photo::Migration),
            Box::new(m20260502_155803_create_walk_dog_event::Migration),
            Box::new(m20260503_052813_create_track_point::Migration),
            Box::new(m20260510_000000_add_birthday_to_dog::Migration),
        ]
    }
}
