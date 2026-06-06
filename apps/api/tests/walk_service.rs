use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::TimeZone;
use sea_orm::{DatabaseBackend, MockDatabase};
use uuid::Uuid;
use walking_dog::{
    entity::walk,
    service::{
        track_point::{TrackPoint, TrackPointRepository, TrackPointRepositoryError},
        walk as walk_service,
    },
};

#[derive(Clone, Default)]
struct FakeTrackPointRepository {
    points: Arc<Vec<TrackPoint>>,
    requested_walk_ids: Arc<Mutex<Vec<Uuid>>>,
}

#[async_trait]
impl TrackPointRepository for FakeTrackPointRepository {
    async fn put(&self, _point: &TrackPoint) -> Result<(), TrackPointRepositoryError> {
        unimplemented!("finish_walk should only read track points")
    }

    async fn batch_put(&self, _points: &[TrackPoint]) -> Result<(), TrackPointRepositoryError> {
        unimplemented!("finish_walk should only read track points")
    }

    async fn find_by_walk_id_and_tracked_at(
        &self,
        _walk_id: Uuid,
        _tracked_at: chrono::DateTime<chrono::Utc>,
    ) -> Result<Option<TrackPoint>, TrackPointRepositoryError> {
        unimplemented!("finish_walk should only list track points")
    }

    async fn find_all_by_walk_id(
        &self,
        walk_id: Uuid,
    ) -> Result<Vec<TrackPoint>, TrackPointRepositoryError> {
        self.requested_walk_ids.lock().unwrap().push(walk_id);
        Ok(self.points.as_ref().clone())
    }
}

fn fixed_time() -> sea_orm::prelude::DateTimeWithTimeZone {
    chrono::Utc
        .with_ymd_and_hms(2026, 5, 24, 9, 0, 0)
        .single()
        .unwrap()
        .into()
}

fn walk_model(id: Uuid, user_id: Uuid) -> walk::Model {
    walk::Model {
        id,
        user_id,
        started_at: fixed_time(),
        ended_at: None,
        distance: None,
        created_at: fixed_time(),
        updated_at: fixed_time(),
    }
}

fn ended_walk_model(id: Uuid, user_id: Uuid, distance: i64) -> walk::Model {
    walk::Model {
        ended_at: Some(fixed_time()),
        distance: Some(distance),
        ..walk_model(id, user_id)
    }
}

fn track_point(walk_id: Uuid, latitude: f64, longitude: f64) -> TrackPoint {
    TrackPoint::new(
        walk_id,
        chrono::Utc
            .with_ymd_and_hms(2026, 5, 24, 9, 0, 0)
            .single()
            .unwrap(),
        latitude,
        longitude,
    )
}

#[tokio::test]
async fn finish_walk_loads_track_points_through_repository_and_persists_distance() {
    let user_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
    let walk_id = Uuid::parse_str("019e541d-f9ff-7e33-9db6-71b08c717a28").unwrap();
    let repository = FakeTrackPointRepository {
        points: Arc::new(vec![
            track_point(walk_id, 35.6812, 139.7671),
            track_point(walk_id, 35.6896, 139.7006),
            track_point(walk_id, 35.6812, 139.7671),
        ]),
        ..Default::default()
    };
    let expected_distance = 12_156;
    let db = MockDatabase::new(DatabaseBackend::Postgres)
        .append_query_results([[walk_model(walk_id, user_id)]])
        .append_query_results([[ended_walk_model(walk_id, user_id, expected_distance)]])
        .into_connection();

    let walk = walk_service::finish_walk(&db, &repository, user_id, walk_id, fixed_time().into())
        .await
        .unwrap();

    assert_eq!(walk.distance, Some(expected_distance));
    assert_eq!(
        *repository.requested_walk_ids.lock().unwrap(),
        vec![walk_id]
    );
}

#[tokio::test]
async fn finish_walk_returns_ended_walk_without_reading_track_points() {
    let user_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
    let walk_id = Uuid::parse_str("019e541d-f9ff-7e33-9db6-71b08c717a28").unwrap();
    let repository = FakeTrackPointRepository::default();
    let ended_walk = ended_walk_model(walk_id, user_id, 123);
    let db = MockDatabase::new(DatabaseBackend::Postgres)
        .append_query_results([[ended_walk.clone()]])
        .into_connection();

    let walk = walk_service::finish_walk(&db, &repository, user_id, walk_id, fixed_time().into())
        .await
        .unwrap();

    assert_eq!(walk, ended_walk);
    assert!(repository.requested_walk_ids.lock().unwrap().is_empty());
}
