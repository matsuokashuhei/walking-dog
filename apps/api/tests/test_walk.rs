#[allow(unused)]
mod support;

async fn create_test_dog(client: &support::TestClient) -> String {
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "WalkDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    body["data"]["createDog"]["id"]
        .as_str()
        .unwrap()
        .to_string()
}

#[tokio::test]
async fn test_start_walk() {
    let client = support::test_client().await;
    let dog_id = create_test_dog(&client).await;

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id status startedAt }} }}"#, dog_id)
        }))
        .send().await.unwrap();
    assert_eq!(res.status(), 200);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        body["data"]["startWalk"]["status"], "active",
        "got: {:?}",
        body
    );
    assert!(body["data"]["startWalk"]["id"].is_string());
}

#[tokio::test]
async fn test_start_walk_empty_dogs_returns_error() {
    let client = support::test_client().await;
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { startWalk(dogIds: []) { id } }"#
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert!(
        body["errors"].is_array(),
        "expected errors, got: {:?}",
        body
    );
    let err_msg = body["errors"][0]["message"].as_str().unwrap();
    assert!(
        err_msg.contains("dogIds") || err_msg.to_lowercase().contains("empty"),
        "got: {}",
        err_msg
    );
}

#[tokio::test]
async fn test_finish_walk() {
    let client = support::test_client().await;
    let dog_id = create_test_dog(&client).await;

    // 散歩開始
    let start_res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
        }))
        .send()
        .await
        .unwrap();
    let start_body: serde_json::Value = start_res.json().await.unwrap();
    let walk_id = start_body["data"]["startWalk"]["id"].as_str().unwrap();

    // 散歩終了
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ finishWalk(walkId: "{}") {{ id status endedAt }} }}"#, walk_id)
        }))
        .send().await.unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        body["data"]["finishWalk"]["status"], "finished",
        "got: {:?}",
        body
    );
    assert!(body["data"]["finishWalk"]["endedAt"].is_string());
}

#[tokio::test]
async fn test_my_walks_query() {
    let client = support::test_client().await;
    let dog_id = create_test_dog(&client).await;

    // 散歩を2件作成
    for _ in 0..2 {
        client
            .post("/graphql")
            .header("Authorization", "Bearer test-token")
            .json(&serde_json::json!({
                "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
            }))
            .send()
            .await
            .unwrap();
    }

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"{ myWalks { id status startedAt } }"#
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 200);
    let body: serde_json::Value = res.json().await.unwrap();
    let walks = body["data"]["myWalks"].as_array().unwrap();
    assert!(
        walks.len() >= 2,
        "expected >= 2 walks, got: {}",
        walks.len()
    );
}

#[tokio::test]
async fn test_add_walk_points_rejects_non_owner() {
    // USER_A starts a walk; USER_B attempts to add GPS points to it.
    // require_walk_owner should reject and collapse the authz failure
    // into a NOT_FOUND error (walk-ID enumeration defense — see
    // graphql/auth_helpers.rs::resolve_user_and_walk).
    let client = support::test_client().await;

    let a_dog_body = support::graphql_as(
        &client,
        &support::USER_A,
        r#"mutation { createDog(input: { name: "UserADog" }) { id } }"#,
    )
    .await;
    let a_dog_id = a_dog_body["data"]["createDog"]["id"].as_str().unwrap();

    let a_walk_body = support::graphql_as(
        &client,
        &support::USER_A,
        &format!(
            r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#,
            a_dog_id
        ),
    )
    .await;
    let a_walk_id = a_walk_body["data"]["startWalk"]["id"].as_str().unwrap();

    let b_res = support::graphql_as(
        &client,
        &support::USER_B,
        &format!(
            r#"mutation {{ addWalkPoints(walkId: "{}", points: [{{ lat: 35.0, lng: 139.0, recordedAt: "2026-04-24T10:00:00Z" }}]) }}"#,
            a_walk_id
        ),
    )
    .await;

    assert!(
        b_res["errors"].is_array() && !b_res["errors"].as_array().unwrap().is_empty(),
        "USER_B must not be allowed to add points to USER_A's walk; got: {:?}",
        b_res
    );
    let code = b_res["errors"][0]["extensions"]["code"].as_str();
    assert_eq!(
        code,
        Some("NOT_FOUND"),
        "Expected NOT_FOUND code (walk-ID enumeration defense); got: {:?}",
        b_res["errors"][0]
    );
}

#[tokio::test]
async fn test_dog_walk_stats_respects_week_period() {
    // End-to-end verification of the M3 fix: Period::from_str was
    // case-sensitive and the GraphQL enum sends "WEEK" (uppercase),
    // which silently fell back to Period::All. After the fix,
    // dogWalkStats(period: "WEEK") should actually exclude walks
    // older than 7 days.
    use sea_orm::{ActiveModelTrait, EntityTrait, Set};

    let client = support::test_client().await;

    let dog_body = support::graphql_as(
        &client,
        &support::USER_A,
        r#"mutation { createDog(input: { name: "PeriodDog" }) { id } }"#,
    )
    .await;
    let dog_id_str = dog_body["data"]["createDog"]["id"].as_str().unwrap();

    let walk_body = support::graphql_as(
        &client,
        &support::USER_A,
        &format!(
            r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#,
            dog_id_str
        ),
    )
    .await;
    let walk_id_str = walk_body["data"]["startWalk"]["id"].as_str().unwrap();
    let walk_id = uuid::Uuid::parse_str(walk_id_str).unwrap();

    let _ = support::graphql_as(
        &client,
        &support::USER_A,
        &format!(
            r#"mutation {{ finishWalk(walkId: "{}", distanceM: 500) {{ id }} }}"#,
            walk_id_str
        ),
    )
    .await;

    // Backdate the walk by 14 days so it falls outside the WEEK window
    // (7 days) but inside the ALL window (unbounded).
    let config = walking_dog_api::config::Config::from_env();
    let db = walking_dog_api::db::connect(&config.database_url)
        .await
        .expect("Failed to connect to DB");
    let two_weeks_ago = chrono::Utc::now() - chrono::Duration::days(14);
    let walk = walking_dog_api::entities::walks::Entity::find_by_id(walk_id)
        .one(&db)
        .await
        .expect("DB query failed")
        .expect("walk must exist after finishWalk");
    let mut active: walking_dog_api::entities::walks::ActiveModel = walk.into();
    active.started_at = Set(two_weeks_ago.into());
    active
        .update(&db)
        .await
        .expect("Failed to backdate walk.started_at");

    // WEEK must EXCLUDE the 2-week-old walk (pre-M3 this returned 1 via All-fallback)
    let week_body = support::graphql_as(
        &client,
        &support::USER_A,
        &format!(
            r#"{{ dogWalkStats(dogId: "{}", period: "WEEK") {{ totalWalks }} }}"#,
            dog_id_str
        ),
    )
    .await;
    assert_eq!(
        week_body["data"]["dogWalkStats"]["totalWalks"], 0,
        "WEEK must exclude walks older than 7 days; got: {:?}",
        week_body
    );

    // ALL must include the walk
    let all_body = support::graphql_as(
        &client,
        &support::USER_A,
        &format!(
            r#"{{ dogWalkStats(dogId: "{}", period: "ALL") {{ totalWalks }} }}"#,
            dog_id_str
        ),
    )
    .await;
    assert_eq!(
        all_body["data"]["dogWalkStats"]["totalWalks"], 1,
        "ALL must include the walk regardless of age; got: {:?}",
        all_body
    );
}

#[tokio::test]
async fn test_add_walk_points() {
    let client = support::test_client().await;
    let dog_id = create_test_dog(&client).await;

    let start_res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
        }))
        .send()
        .await
        .unwrap();
    let start_body: serde_json::Value = start_res.json().await.unwrap();
    let walk_id = start_body["data"]["startWalk"]["id"].as_str().unwrap();

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{
                addWalkPoints(walkId: "{}", points: [
                    {{ lat: 35.6762, lng: 139.6503, recordedAt: "2026-03-21T10:00:00Z" }},
                    {{ lat: 35.6763, lng: 139.6504, recordedAt: "2026-03-21T10:00:05Z" }}
                ])
            }}"#, walk_id)
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["data"]["addWalkPoints"], true, "got: {:?}", body);
}

// 同一バッチ内に同じ recorded_at を持つ point が複数含まれていても、
// `BatchWriteItem` の `ValidationException: "Provided list of item keys
// contains duplicates"` で失敗してはならない。Sentry WALKING-DOG-API-DEV-2/3/4
// の回帰テスト。
#[tokio::test]
async fn test_add_walk_points_with_duplicate_recorded_at_succeeds() {
    let client = support::test_client().await;
    let dog_id = create_test_dog(&client).await;

    let start_res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
        }))
        .send()
        .await
        .unwrap();
    let start_body: serde_json::Value = start_res.json().await.unwrap();
    let walk_id = start_body["data"]["startWalk"]["id"].as_str().unwrap();

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{
                addWalkPoints(walkId: "{}", points: [
                    {{ lat: 35.6762, lng: 139.6503, recordedAt: "2026-04-26T02:45:35.951Z" }},
                    {{ lat: 35.6763, lng: 139.6504, recordedAt: "2026-04-26T02:45:35.951Z" }},
                    {{ lat: 35.6764, lng: 139.6505, recordedAt: "2026-04-26T02:45:40.000Z" }}
                ])
            }}"#, walk_id)
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        body["data"]["addWalkPoints"], true,
        "duplicate recorded_at must be deduped server-side, got: {:?}",
        body
    );
}
