use crate::entities::{dogs::Model as DogModel, users::Model as UserModel};
use crate::graphql::mutations::dog_member::DogMemberOutput;
use crate::services::{dog_member_service, dog_service, user_service, walk_service};
use async_graphql::dataloader::Loader;
use sea_orm::DatabaseConnection;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct UserByIdLoader {
    db: DatabaseConnection,
}

impl UserByIdLoader {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

impl Loader<Uuid> for UserByIdLoader {
    type Value = UserModel;
    type Error = String;

    fn load(
        &self,
        keys: &[Uuid],
    ) -> impl std::future::Future<Output = Result<HashMap<Uuid, Self::Value>, Self::Error>> + Send
    {
        let db = self.db.clone();
        let keys = keys.to_vec();
        async move {
            user_service::get_users_by_ids(&db, &keys)
                .await
                .map(|users| users.into_iter().map(|user| (user.id, user)).collect())
                .map_err(|err| err.to_string())
        }
    }
}

#[derive(Clone)]
pub struct DogByIdLoader {
    db: DatabaseConnection,
}

impl DogByIdLoader {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

impl Loader<Uuid> for DogByIdLoader {
    type Value = DogModel;
    type Error = String;

    fn load(
        &self,
        keys: &[Uuid],
    ) -> impl std::future::Future<Output = Result<HashMap<Uuid, Self::Value>, Self::Error>> + Send
    {
        let db = self.db.clone();
        let keys = keys.to_vec();
        async move {
            dog_service::get_dogs_by_ids(&db, &keys)
                .await
                .map(|dogs| dogs.into_iter().map(|dog| (dog.id, dog)).collect())
                .map_err(|err| err.to_string())
        }
    }
}

#[derive(Clone)]
pub struct DogMembersByDogIdLoader {
    db: DatabaseConnection,
}

impl DogMembersByDogIdLoader {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

impl Loader<Uuid> for DogMembersByDogIdLoader {
    type Value = Vec<DogMemberOutput>;
    type Error = String;

    fn load(
        &self,
        keys: &[Uuid],
    ) -> impl std::future::Future<Output = Result<HashMap<Uuid, Self::Value>, Self::Error>> + Send
    {
        let db = self.db.clone();
        let keys = keys.to_vec();
        async move {
            dog_member_service::get_members_by_dog_ids(&db, &keys)
                .await
                .map(|members| {
                    members
                        .into_iter()
                        .map(|(dog_id, rows)| {
                            (
                                dog_id,
                                rows.into_iter()
                                    .map(DogMemberOutput::from)
                                    .collect::<Vec<_>>(),
                            )
                        })
                        .collect()
                })
                .map_err(|err| err.to_string())
        }
    }
}

#[derive(Clone)]
pub struct DogsByWalkIdLoader {
    db: DatabaseConnection,
}

impl DogsByWalkIdLoader {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

impl Loader<Uuid> for DogsByWalkIdLoader {
    type Value = Vec<DogModel>;
    type Error = String;

    fn load(
        &self,
        keys: &[Uuid],
    ) -> impl std::future::Future<Output = Result<HashMap<Uuid, Self::Value>, Self::Error>> + Send
    {
        let db = self.db.clone();
        let keys = keys.to_vec();
        async move {
            walk_service::get_dogs_for_walk_ids(&db, &keys)
                .await
                .map_err(|err| err.to_string())
        }
    }
}

pub type UserLoader = async_graphql::dataloader::DataLoader<UserByIdLoader>;
pub type DogLoader = async_graphql::dataloader::DataLoader<DogByIdLoader>;
pub type DogMembersLoader = async_graphql::dataloader::DataLoader<DogMembersByDogIdLoader>;
pub type WalkDogsLoader = async_graphql::dataloader::DataLoader<DogsByWalkIdLoader>;

pub fn build_user_loader(db: &DatabaseConnection) -> Arc<UserLoader> {
    Arc::new(async_graphql::dataloader::DataLoader::new(
        UserByIdLoader::new(db.clone()),
        tokio::spawn,
    ))
}

pub fn build_dog_loader(db: &DatabaseConnection) -> Arc<DogLoader> {
    Arc::new(async_graphql::dataloader::DataLoader::new(
        DogByIdLoader::new(db.clone()),
        tokio::spawn,
    ))
}

pub fn build_dog_members_loader(db: &DatabaseConnection) -> Arc<DogMembersLoader> {
    Arc::new(async_graphql::dataloader::DataLoader::new(
        DogMembersByDogIdLoader::new(db.clone()),
        tokio::spawn,
    ))
}

pub fn build_walk_dogs_loader(db: &DatabaseConnection) -> Arc<WalkDogsLoader> {
    Arc::new(async_graphql::dataloader::DataLoader::new(
        DogsByWalkIdLoader::new(db.clone()),
        tokio::spawn,
    ))
}
