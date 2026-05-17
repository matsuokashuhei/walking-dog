use crate::entity::{dog_walk_goal, walk_amount};
use async_graphql::SimpleObject;
use uuid::Uuid;

#[derive(SimpleObject, Clone, Debug)]
pub struct WalkAmount {
    pub minutes: i32,
    pub cycle_days: i32,
}

impl From<walk_amount::Model> for WalkAmount {
    fn from(m: walk_amount::Model) -> Self {
        Self {
            minutes: m.minutes,
            cycle_days: m.cycle_days,
        }
    }
}

#[derive(SimpleObject, Clone, Debug)]
pub struct DogWalkGoal {
    pub id: Uuid,
    pub dog_id: Uuid,
    pub walk_amount: WalkAmount,
    pub effective_from: chrono::NaiveDate,
    pub effective_to: Option<chrono::NaiveDate>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<dog_walk_goal::Model> for DogWalkGoal {
    fn from(m: dog_walk_goal::Model) -> Self {
        Self {
            id: m.id,
            dog_id: m.dog_id,
            walk_amount: m.walk_amount.into(),
            effective_from: m.effective_from,
            effective_to: m.effective_to,
            created_at: m.created_at.into(),
            updated_at: m.updated_at.into(),
        }
    }
}
