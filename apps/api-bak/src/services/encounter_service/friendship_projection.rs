use crate::error::AppError;
use crate::services::{dog_pair::DogPair, friendship_service};
use chrono::{DateTime, Utc};
use sea_orm::ConnectionTrait;

pub async fn record_new_encounter<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
    duration_sec: i32,
    met_at: DateTime<Utc>,
) -> Result<(), AppError> {
    friendship_service::upsert_friendship(db, pair, duration_sec, met_at)
        .await
        .map(|_| ())
}

pub async fn apply_duration_delta<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
    delta_sec: i32,
) -> Result<(), AppError> {
    friendship_service::update_friendship_duration(db, pair, delta_sec)
        .await
        .map(|_| ())
}

pub async fn record_existing_encounter_update<C: ConnectionTrait>(
    db: &C,
    pair: DogPair,
    delta_sec: i32,
    met_at: DateTime<Utc>,
) -> Result<(), AppError> {
    friendship_service::update_friendship_duration_and_last_met(db, pair, delta_sec, met_at)
        .await
        .map(|_| ())
}

pub fn duration_increase_delta(old_duration_sec: i32, new_duration_sec: i32) -> i32 {
    (new_duration_sec - old_duration_sec).max(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn duration_increase_delta_returns_growth_only() {
        assert_eq!(duration_increase_delta(30, 45), 15);
    }

    #[test]
    fn duration_increase_delta_returns_zero_when_duration_does_not_grow() {
        assert_eq!(duration_increase_delta(45, 30), 0);
        assert_eq!(duration_increase_delta(30, 30), 0);
    }
}
