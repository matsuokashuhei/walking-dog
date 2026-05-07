use anyhow::Result;
use anyhow::anyhow;
use async_graphql::{Context, InputObject, Object};
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet, Set},
    ColumnTrait, EntityTrait, QueryFilter, TransactionTrait,
};
use uuid::Uuid;

use crate::entity::{dog, user_dog};
use crate::graphql::object::walk::Walk;
use crate::{entity::user, graphql::guard::AuthGuard};

#[derive(Default, Debug)]
pub struct WalkMutation;

#[Object]
impl WalkMutation {
    #[graphql(guard = "AuthGuard")]
    async fn start_walk(&self, ctx: &Context<'_>, input: StartWalkInput) -> Result<Walk> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let txn = db.begin().await?;
        let walk = crate::entity::walk::ActiveModel {
            user_id: Set(user.id),
            started_at: Set(chrono::Utc::now().into()),
            ..Default::default()
        }
        .insert(db)
        .await?;

        for dog_id in input.dog_ids.iter() {
            let dog: Option<dog::Model> = dog::Entity::find_by_id(*dog_id)
                .has_related(user_dog::Entity, user_dog::Column::UserId.eq(user.id))
                .one(db)
                .await?;
            if dog.is_none() {
                return Err(anyhow!("Dog not found or not owned by user"));
            }
            let active_model = crate::entity::walk_dog::ActiveModel {
                walk_id: Set(walk.id),
                dog_id: Set(*dog_id),
                ..Default::default()
            };
            active_model.insert(db).await?;
        }
        txn.commit().await?;
        Ok(Walk::from(walk))
    }

    #[graphql(guard = "AuthGuard")]
    async fn end_walk(&self, ctx: &Context<'_>, input: EndWalkInput) -> Result<Walk> {
        let user = ctx.data::<user::Model>().unwrap();
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let Some(walk) = crate::entity::walk::Entity::find_by_id(input.id)
            .filter(crate::entity::walk::Column::UserId.eq(user.id))
            .one(db)
            .await?
        else {
            return Err(anyhow!("Walk not found or not owned by user"));
        };
        let active_model = crate::entity::walk::ActiveModel {
            id: Set(walk.id.into()),
            ended_at: Set(Some(chrono::Utc::now().into())),
            distance: NotSet,
            ..Default::default()
        };
        let updated_walk = active_model.update(db).await?;
        Ok(Walk::from(updated_walk))
    }
}

#[derive(Clone, Debug, InputObject)]
struct StartWalkInput {
    dog_ids: Vec<Uuid>,
}

#[derive(Clone, Debug, InputObject)]
struct EndWalkInput {
    id: Uuid,
}
