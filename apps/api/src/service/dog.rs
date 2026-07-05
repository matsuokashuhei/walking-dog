use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, Condition, ConnectionTrait, DatabaseConnection, EntityTrait, ModelTrait,
    QueryFilter, TransactionTrait,
};
use uuid::Uuid;

use crate::{
    entity::{birthday, dog, sea_orm_active_enums::GenderType, user_dog, walk_amount},
    service::{
        dog_walk_goal,
        error::{ServiceError, ServiceResult, map_transaction_error},
    },
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum FieldUpdate<T> {
    Unchanged,
    Set(T),
}

#[derive(Clone, Debug)]
pub struct AddDogCommand {
    pub name: String,
    pub breed: Option<String>,
    pub gender: GenderType,
    pub avatar: Option<String>,
    pub birthday: Option<birthday::Model>,
    pub walk_goal: Option<walk_amount::Model>,
}

#[derive(Clone, Debug)]
pub struct UpdateDogCommand {
    pub id: Uuid,
    pub name: Option<String>,
    pub breed: Option<String>,
    pub gender: Option<GenderType>,
    pub avatar: Option<String>,
    pub birthday: FieldUpdate<Option<birthday::Model>>,
    pub daily_goal_minutes: Option<i32>,
    pub walk_goal: Option<walk_amount::Model>,
}

pub async fn add_dog(
    db: &DatabaseConnection,
    user_id: Uuid,
    command: AddDogCommand,
    today: chrono::NaiveDate,
) -> ServiceResult<dog::Model> {
    db.transaction::<_, dog::Model, ServiceError>(|txn| {
        let command = command.clone();
        Box::pin(async move {
            let walk_goal = command.walk_goal.clone();
            let dog = command.into_active_model().insert(txn).await?;
            user_dog::ActiveModel {
                user_id: Set(user_id),
                dog_id: Set(dog.id),
                ..Default::default()
            }
            .insert(txn)
            .await?;
            if let Some(walk_goal) = walk_goal {
                dog_walk_goal::upsert_goal(txn, dog.id, walk_goal, today).await?;
            }

            Ok(dog)
        })
    })
    .await
    .map_err(map_transaction_error)
}

pub async fn update_dog(
    db: &DatabaseConnection,
    user_id: Uuid,
    command: UpdateDogCommand,
    today: chrono::NaiveDate,
) -> ServiceResult<dog::Model> {
    db.transaction::<_, dog::Model, ServiceError>(|txn| {
        let command = command.clone();
        Box::pin(async move {
            ensure_user_has_dog(txn, user_id, command.id).await?;

            let updated_dog = command.clone().into_active_model().update(txn).await?;
            if let Some(walk_goal) = command.walk_goal {
                dog_walk_goal::upsert_goal(txn, command.id, walk_goal, today).await?;
            } else if let Some(minutes) = command.daily_goal_minutes {
                dog_walk_goal::upsert_daily_goal(txn, command.id, minutes, today).await?;
            }

            Ok(updated_dog)
        })
    })
    .await
    .map_err(map_transaction_error)
}

pub async fn remove_dog(
    db: &DatabaseConnection,
    user_id: Uuid,
    dog_id: Uuid,
) -> ServiceResult<dog::Model> {
    let dog = ensure_user_has_dog(db, user_id, dog_id).await?;
    let user_dog = user_dog::Entity::find()
        .filter(
            Condition::all()
                .add(user_dog::Column::UserId.eq(user_id))
                .add(user_dog::Column::DogId.eq(dog.id)),
        )
        .one(db)
        .await?
        .ok_or(ServiceError::NotFound)?;
    user_dog.delete(db).await?;
    Ok(dog)
}

pub async fn ensure_user_has_dog<C>(
    db: &C,
    user_id: Uuid,
    dog_id: Uuid,
) -> ServiceResult<dog::Model>
where
    C: ConnectionTrait,
{
    dog::Entity::find_by_id(dog_id)
        .has_related(user_dog::Entity, user_dog::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or(ServiceError::NotFound)
}

impl AddDogCommand {
    fn into_active_model(self) -> dog::ActiveModel {
        dog::ActiveModel {
            name: Set(self.name),
            breed: Set(self.breed),
            gender: Set(self.gender),
            avatar: Set(self.avatar),
            birthday: Set(self.birthday),
            ..Default::default()
        }
    }
}

impl UpdateDogCommand {
    fn into_active_model(self) -> dog::ActiveModel {
        dog::ActiveModel {
            id: Set(self.id),
            name: self.name.map_or(NotSet, Set),
            breed: self.breed.map_or(NotSet, |breed| Set(breed.into())),
            gender: self.gender.map_or(NotSet, Set),
            avatar: self.avatar.map_or(NotSet, |avatar| Set(Some(avatar))),
            birthday: match self.birthday {
                FieldUpdate::Unchanged => NotSet,
                FieldUpdate::Set(birthday) => Set(birthday),
            },
            ..Default::default()
        }
    }
}
