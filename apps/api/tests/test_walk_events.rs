mod common;

// ─── T-A2: Entity Tests ───────────────────────────────────────────────────────

#[tokio::test]
async fn find_by_walk_id_returns_empty_for_new_walk() {
    use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
    use walking_dog_api::entities::walk_events;

    let client = common::test_client().await;

    // Create a dog and start a walk via GraphQL
    let dog_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "EventTestDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let dog_id = dog_body["data"]["createDog"]["id"].as_str().unwrap();

    let walk_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let walk_id_str = walk_body["data"]["startWalk"]["id"].as_str().unwrap();
    let walk_id = uuid::Uuid::parse_str(walk_id_str).unwrap();

    // Get DB connection
    let config = walking_dog_api::config::Config::from_env();
    let db = walking_dog_api::db::connect(&config.database_url)
        .await
        .expect("Failed to connect to DB");

    let events = walk_events::Entity::find()
        .filter(walk_events::Column::WalkId.eq(walk_id))
        .all(&db)
        .await
        .expect("Failed to query walk_events");

    assert!(events.is_empty(), "Expected no events for new walk");
}

// ─── T-A3: Service Tests ──────────────────────────────────────────────────────

#[tokio::test]
async fn record_event_pee_inserts_row() {
    use walking_dog_api::services::walk_event_service::{self, RecordEventInput};

    let client = common::test_client().await;

    let dog_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "PeeTestDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let dog_id_str = dog_body["data"]["createDog"]["id"].as_str().unwrap();
    let dog_id = uuid::Uuid::parse_str(dog_id_str).unwrap();

    let walk_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id_str)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let walk_id_str = walk_body["data"]["startWalk"]["id"].as_str().unwrap();
    let walk_id = uuid::Uuid::parse_str(walk_id_str).unwrap();

    let config = walking_dog_api::config::Config::from_env();
    let db = walking_dog_api::db::connect(&config.database_url)
        .await
        .expect("Failed to connect to DB");

    // In TEST_MODE "test-token" Bearer maps to "test-user-cognito-sub" cognito_sub
    let user =
        walking_dog_api::services::user_service::get_or_create_user(&db, "test-user-cognito-sub")
            .await
            .unwrap();

    let input = RecordEventInput {
        dog_id: Some(dog_id),
        event_type: "pee".to_string(),
        occurred_at: chrono::Utc::now().into(),
        lat: Some(35.6812),
        lng: Some(139.7671),
        photo_key: None,
    };

    let event = walk_event_service::record_event(&db, walk_id, user.id, input)
        .await
        .expect("Failed to record pee event");

    assert_eq!(event.event_type, "pee");
    assert_eq!(event.walk_id, walk_id);
    assert_eq!(event.dog_id, Some(dog_id));
    assert!(event.lat.is_some());
    assert!(event.lng.is_some());
    assert!(event.photo_url.is_none());
}

#[tokio::test]
async fn record_event_rejects_non_owner() {
    use walking_dog_api::services::walk_event_service::{self, RecordEventInput};

    let client = common::test_client().await;

    let dog_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "RejectTestDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let dog_id_str = dog_body["data"]["createDog"]["id"].as_str().unwrap();

    let walk_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id_str)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let walk_id_str = walk_body["data"]["startWalk"]["id"].as_str().unwrap();
    let walk_id = uuid::Uuid::parse_str(walk_id_str).unwrap();

    let config = walking_dog_api::config::Config::from_env();
    let db = walking_dog_api::db::connect(&config.database_url)
        .await
        .expect("Failed to connect to DB");

    // User B (not owner) attempts to record event
    let user_b =
        walking_dog_api::services::user_service::get_or_create_user(&db, "test-user-b-cognito-sub")
            .await
            .unwrap();

    let input = RecordEventInput {
        dog_id: None,
        event_type: "poo".to_string(),
        occurred_at: chrono::Utc::now().into(),
        lat: None,
        lng: None,
        photo_key: None,
    };

    let result = walk_event_service::record_event(&db, walk_id, user_b.id, input).await;
    assert!(
        result.is_err(),
        "Expected authorization error for non-owner"
    );
}

#[tokio::test]
async fn record_event_without_gps_succeeds() {
    use walking_dog_api::services::walk_event_service::{self, RecordEventInput};

    let client = common::test_client().await;

    let dog_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "NoGpsDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let dog_id_str = dog_body["data"]["createDog"]["id"].as_str().unwrap();

    let walk_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id_str)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let walk_id_str = walk_body["data"]["startWalk"]["id"].as_str().unwrap();
    let walk_id = uuid::Uuid::parse_str(walk_id_str).unwrap();

    let config = walking_dog_api::config::Config::from_env();
    let db = walking_dog_api::db::connect(&config.database_url)
        .await
        .expect("Failed to connect to DB");

    let user =
        walking_dog_api::services::user_service::get_or_create_user(&db, "test-user-cognito-sub")
            .await
            .unwrap();

    // No GPS coordinates
    let input = RecordEventInput {
        dog_id: None,
        event_type: "poo".to_string(),
        occurred_at: chrono::Utc::now().into(),
        lat: None,
        lng: None,
        photo_key: None,
    };

    let event = walk_event_service::record_event(&db, walk_id, user.id, input)
        .await
        .expect("Should succeed without GPS");

    assert_eq!(event.event_type, "poo");
    assert!(event.lat.is_none());
    assert!(event.lng.is_none());
}

#[tokio::test]
async fn record_event_photo_requires_photo_key() {
    use walking_dog_api::services::walk_event_service::{self, RecordEventInput};

    let client = common::test_client().await;

    let dog_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "PhotoReqDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let dog_id_str = dog_body["data"]["createDog"]["id"].as_str().unwrap();

    let walk_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id_str)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let walk_id_str = walk_body["data"]["startWalk"]["id"].as_str().unwrap();
    let walk_id = uuid::Uuid::parse_str(walk_id_str).unwrap();

    let config = walking_dog_api::config::Config::from_env();
    let db = walking_dog_api::db::connect(&config.database_url)
        .await
        .expect("Failed to connect to DB");

    let user =
        walking_dog_api::services::user_service::get_or_create_user(&db, "test-user-cognito-sub")
            .await
            .unwrap();

    // photo event without photo_key should fail
    let input = RecordEventInput {
        dog_id: None,
        event_type: "photo".to_string(),
        occurred_at: chrono::Utc::now().into(),
        lat: None,
        lng: None,
        photo_key: None,
    };

    let result = walk_event_service::record_event(&db, walk_id, user.id, input).await;
    assert!(result.is_err(), "photo event without photo_key should fail");
}

#[tokio::test]
async fn list_events_returns_in_occurred_at_asc() {
    use walking_dog_api::services::walk_event_service::{self, RecordEventInput};

    let client = common::test_client().await;

    let dog_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "ListEventsTestDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let dog_id_str = dog_body["data"]["createDog"]["id"].as_str().unwrap();

    let walk_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id_str)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let walk_id_str = walk_body["data"]["startWalk"]["id"].as_str().unwrap();
    let walk_id = uuid::Uuid::parse_str(walk_id_str).unwrap();

    let config = walking_dog_api::config::Config::from_env();
    let db = walking_dog_api::db::connect(&config.database_url)
        .await
        .expect("Failed to connect to DB");

    let user =
        walking_dog_api::services::user_service::get_or_create_user(&db, "test-user-cognito-sub")
            .await
            .unwrap();

    let now = chrono::Utc::now();

    // Insert events out of order
    let input_poo = RecordEventInput {
        dog_id: None,
        event_type: "poo".to_string(),
        occurred_at: (now + chrono::Duration::seconds(60)).into(),
        lat: None,
        lng: None,
        photo_key: None,
    };
    let input_pee = RecordEventInput {
        dog_id: None,
        event_type: "pee".to_string(),
        occurred_at: now.into(),
        lat: None,
        lng: None,
        photo_key: None,
    };

    walk_event_service::record_event(&db, walk_id, user.id, input_poo)
        .await
        .unwrap();
    walk_event_service::record_event(&db, walk_id, user.id, input_pee)
        .await
        .unwrap();

    let events = walk_event_service::list_events(&db, walk_id)
        .await
        .expect("Failed to list events");

    assert_eq!(events.len(), 2);
    assert_eq!(
        events[0].event_type, "pee",
        "First event should be pee (earlier occurred_at)"
    );
    assert_eq!(
        events[1].event_type, "poo",
        "Second event should be poo (later occurred_at)"
    );
}

// ─── T-A4: S3 Service Tests ────────────────────────────────────────────────────

#[tokio::test]
async fn generate_walk_event_photo_upload_url_returns_presigned_put_with_walks_prefix() {
    use walking_dog_api::services::s3_service;

    std::env::set_var("TEST_MODE", "true");
    let config = walking_dog_api::config::Config::from_env();
    let s3 = walking_dog_api::aws::client::build_s3_client(
        &config.aws_region,
        config.s3_endpoint_url.as_deref(),
    )
    .await;

    let walk_id = uuid::Uuid::new_v4();
    let result = s3_service::generate_walk_event_photo_upload_url(
        &s3,
        &config.s3_bucket_dog_photos,
        walk_id,
        "image/jpeg",
    )
    .await
    .expect("Failed to generate presigned URL");

    assert!(
        result.key.starts_with(&format!("walks/{}/", walk_id)),
        "Key should start with walks/{walk_id}/, got: {}",
        result.key
    );
    assert!(
        result.key.ends_with(".jpg"),
        "Key should end with .jpg, got: {}",
        result.key
    );
    assert!(!result.url.is_empty(), "URL should not be empty");
}

#[tokio::test]
async fn generate_walk_event_photo_upload_url_rejects_invalid_content_type() {
    use walking_dog_api::services::s3_service;

    std::env::set_var("TEST_MODE", "true");
    let config = walking_dog_api::config::Config::from_env();
    let s3 = walking_dog_api::aws::client::build_s3_client(
        &config.aws_region,
        config.s3_endpoint_url.as_deref(),
    )
    .await;

    let walk_id = uuid::Uuid::new_v4();
    let result = s3_service::generate_walk_event_photo_upload_url(
        &s3,
        &config.s3_bucket_dog_photos,
        walk_id,
        "application/pdf",
    )
    .await;

    assert!(
        result.is_err(),
        "Expected error for unsupported content type"
    );
}

// ─── T-A5: GraphQL Mutation Tests ─────────────────────────────────────────────

#[tokio::test]
async fn mutation_record_walk_event_pee_returns_event() {
    let client = common::test_client().await;

    let dog_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "MutPeeDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let dog_id = dog_body["data"]["createDog"]["id"].as_str().unwrap();

    let walk_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let walk_id = walk_body["data"]["startWalk"]["id"].as_str().unwrap();

    let body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{
                recordWalkEvent(input: {{
                    walkId: "{}"
                    eventType: "pee"
                    occurredAt: "2026-04-12T12:00:00Z"
                    lat: 35.6812
                    lng: 139.7671
                }}) {{
                    id
                    eventType
                    occurredAt
                    lat
                    lng
                    photoUrl
                }}
            }}"#, walk_id)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();

    assert!(
        body["errors"].is_null(),
        "Expected no errors, got: {:?}",
        body
    );
    let event = &body["data"]["recordWalkEvent"];
    assert_eq!(event["eventType"].as_str().unwrap(), "pee");
    assert!(event["id"].as_str().is_some());
    assert!(event["lat"].as_f64().is_some());
    assert!(event["lng"].as_f64().is_some());
    assert!(event["photoUrl"].is_null());
}

#[tokio::test]
async fn mutation_record_walk_event_photo_resolves_cloudfront_url() {
    let client = common::test_client().await;

    let dog_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "MutPhotoDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let dog_id = dog_body["data"]["createDog"]["id"].as_str().unwrap();

    let walk_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let walk_id = walk_body["data"]["startWalk"]["id"].as_str().unwrap();

    let photo_key = format!("walks/{}/test-photo.jpg", walk_id);

    let body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{
                recordWalkEvent(input: {{
                    walkId: "{}"
                    eventType: "photo"
                    occurredAt: "2026-04-12T12:00:00Z"
                    photoKey: "{}"
                }}) {{
                    id
                    eventType
                    photoUrl
                }}
            }}"#, walk_id, photo_key)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();

    assert!(
        body["errors"].is_null(),
        "Expected no errors, got: {:?}",
        body
    );
    let event = &body["data"]["recordWalkEvent"];
    assert_eq!(event["eventType"].as_str().unwrap(), "photo");
    let photo_url = event["photoUrl"]
        .as_str()
        .expect("photoUrl should be present");
    assert!(
        photo_url.starts_with("http"),
        "photoUrl should be a CloudFront URL, got: {}",
        photo_url
    );
    assert!(
        photo_url.contains(&photo_key),
        "photoUrl should contain the key, got: {}",
        photo_url
    );
}

#[tokio::test]
async fn mutation_record_walk_event_unauthenticated_returns_error() {
    let client = common::test_client().await;

    let body = client
        .post("/graphql")
        .json(&serde_json::json!({
            "query": r#"mutation {
                recordWalkEvent(input: {
                    walkId: "00000000-0000-0000-0000-000000000000"
                    eventType: "pee"
                    occurredAt: "2026-04-12T12:00:00Z"
                }) {
                    id
                }
            }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();

    assert!(
        body["errors"].is_array() && !body["errors"].as_array().unwrap().is_empty(),
        "Expected auth error, got: {:?}",
        body
    );
}

#[tokio::test]
async fn mutation_generate_walk_event_photo_upload_url_returns_key() {
    let client = common::test_client().await;

    let dog_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "PresignedDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let dog_id = dog_body["data"]["createDog"]["id"].as_str().unwrap();

    let walk_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let walk_id = walk_body["data"]["startWalk"]["id"].as_str().unwrap();

    let body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{
                generateWalkEventPhotoUploadUrl(walkId: "{}", contentType: "image/jpeg") {{
                    url
                    key
                    expiresAt
                }}
            }}"#, walk_id)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();

    assert!(
        body["errors"].is_null(),
        "Expected no errors, got: {:?}",
        body
    );
    let result = &body["data"]["generateWalkEventPhotoUploadUrl"];
    let key = result["key"].as_str().expect("key should be present");
    assert!(
        key.starts_with(&format!("walks/{}/", walk_id)),
        "Key should start with walks/{walk_id}/, got: {key}"
    );
    assert!(
        key.ends_with(".jpg"),
        "Key should end with .jpg, got: {key}"
    );
    assert!(!result["url"].as_str().unwrap_or("").is_empty());
}

// ─── T-A6: walk.events resolver Tests ─────────────────────────────────────────

#[tokio::test]
async fn query_walk_returns_events_sorted_by_occurred_at() {
    use walking_dog_api::services::walk_event_service::{self, RecordEventInput};

    let client = common::test_client().await;

    let dog_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "QueryEventsTestDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let dog_id_str = dog_body["data"]["createDog"]["id"].as_str().unwrap();

    let walk_body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id_str)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    let walk_id_str = walk_body["data"]["startWalk"]["id"].as_str().unwrap();
    let walk_id = uuid::Uuid::parse_str(walk_id_str).unwrap();

    let config = walking_dog_api::config::Config::from_env();
    let db = walking_dog_api::db::connect(&config.database_url)
        .await
        .expect("Failed to connect to DB");

    let user =
        walking_dog_api::services::user_service::get_or_create_user(&db, "test-user-cognito-sub")
            .await
            .unwrap();

    let now = chrono::Utc::now();

    walk_event_service::record_event(
        &db,
        walk_id,
        user.id,
        RecordEventInput {
            dog_id: None,
            event_type: "poo".to_string(),
            occurred_at: (now + chrono::Duration::seconds(30)).into(),
            lat: None,
            lng: None,
            photo_key: None,
        },
    )
    .await
    .unwrap();

    walk_event_service::record_event(
        &db,
        walk_id,
        user.id,
        RecordEventInput {
            dog_id: None,
            event_type: "pee".to_string(),
            occurred_at: now.into(),
            lat: None,
            lng: None,
            photo_key: None,
        },
    )
    .await
    .unwrap();

    // Query via GraphQL
    let body = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"{{
                walk(id: "{}") {{
                    id
                    events {{
                        id
                        eventType
                        occurredAt
                    }}
                }}
            }}"#, walk_id_str)
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();

    assert!(
        body["errors"].is_null(),
        "Expected no errors, got: {:?}",
        body
    );
    let events = body["data"]["walk"]["events"]
        .as_array()
        .expect("events should be an array");
    assert_eq!(events.len(), 2);
    assert_eq!(
        events[0]["eventType"].as_str().unwrap(),
        "pee",
        "First event should be pee"
    );
    assert_eq!(
        events[1]["eventType"].as_str().unwrap(),
        "poo",
        "Second event should be poo"
    );
}
