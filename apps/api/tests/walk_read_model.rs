use std::collections::BTreeMap;

use chrono::TimeZone;
use sea_orm::{DatabaseBackend, MockDatabase, Value};
use uuid::Uuid;
use walking_dog::{
    entity::walk,
    service::walk_read_model::{self, WalkHistoryRequest},
};

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
        ended_at: Some(fixed_time()),
        distance: Some(100),
        created_at: fixed_time(),
        updated_at: fixed_time(),
    }
}

fn aggregate_row(
    total_count: i64,
    total_distance: i64,
    total_duration: i64,
) -> BTreeMap<&'static str, Value> {
    BTreeMap::from([
        ("total_count", total_count.into()),
        ("total_distance", total_distance.into()),
        ("total_duration", total_duration.into()),
    ])
}

#[tokio::test]
async fn user_walk_history_returns_totals_and_page_flags() {
    let user_id = Uuid::parse_str("019e0dc4-066b-7a22-b755-969ee6beb5e9").unwrap();
    let first_walk_id = Uuid::parse_str("019e541d-f9ff-7e33-9db6-71b08c717a28").unwrap();
    let second_walk_id = Uuid::parse_str("019e541e-81bb-7f16-bc34-d44a6d08fba1").unwrap();
    let db = MockDatabase::new(DatabaseBackend::Postgres)
        .append_query_results([[aggregate_row(2, 300, 900)]])
        .append_query_results([[
            walk_model(first_walk_id, user_id),
            walk_model(second_walk_id, user_id),
        ]])
        .into_connection();

    let page = walk_read_model::user_walk_history(
        &db,
        user_id,
        WalkHistoryRequest {
            first: Some(1),
            ..Default::default()
        },
    )
    .await
    .unwrap();

    assert_eq!(page.walks.len(), 1);
    assert_eq!(page.walks[0].id, first_walk_id);
    assert_eq!(page.total_count, 2);
    assert_eq!(page.total_distance, 300);
    assert_eq!(page.total_duration, 900);
    assert!(!page.has_previous);
    assert!(page.has_next);
}
