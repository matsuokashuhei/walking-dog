mod common;

/// Helper: enable encounter detection for a user (reset state between tests).
async fn enable_encounter_detection(client: &common::TestClient, user_token: &str) {
    let res = client
        .post("/graphql")
        .header("Authorization", format!("Bearer {}", user_token))
        .json(&serde_json::json!({
            "query": r#"mutation { updateEncounterDetection(enabled: true) { encounterDetectionEnabled } }"#
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert!(
        body["errors"].is_null(),
        "Failed to enable encounter detection: {:?}",
        body
    );
}

/// Helper: create a dog as user and return its ID.
async fn create_dog(client: &common::TestClient, user_token: &str) -> String {
    let res = client
        .post("/graphql")
        .header("Authorization", format!("Bearer {}", user_token))
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "EncounterDog" }) { id } }"#
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

/// Helper: start a walk as user and return walk ID.
async fn start_walk(client: &common::TestClient, user_token: &str, dog_id: &str) -> String {
    let res = client
        .post("/graphql")
        .header("Authorization", format!("Bearer {}", user_token))
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    body["data"]["startWalk"]["id"]
        .as_str()
        .unwrap()
        .to_string()
}

/// Helper: record encounter between two walks.
async fn record_encounter(
    client: &common::TestClient,
    user_token: &str,
    my_walk_id: &str,
    their_walk_id: &str,
) -> serde_json::Value {
    let res = client
        .post("/graphql")
        .header("Authorization", format!("Bearer {}", user_token))
        .json(&serde_json::json!({
            "query": format!(
                r#"mutation {{ recordEncounter(myWalkId: "{}", theirWalkId: "{}") {{
                    id durationSec metAt
                    dog1 {{ id }} dog2 {{ id }}
                }} }}"#,
                my_walk_id, their_walk_id
            )
        }))
        .send()
        .await
        .unwrap();
    res.json().await.unwrap()
}

// ─── Basic Encounter Tests ────────────────────────────────────────────────

#[tokio::test]
async fn test_record_encounter_basic() {
    let client = common::test_client().await;

    // Reset encounter detection to enabled for both users (test isolation)
    enable_encounter_detection(&client, "test-token").await;
    enable_encounter_detection(&client, "test-user-b-cognito-sub").await;

    // User A creates dog D1 and starts walk W1
    let d1 = create_dog(&client, "test-token").await;
    let w1 = start_walk(&client, "test-token", &d1).await;

    // User B creates dog D2 and starts walk W2
    let d2 = create_dog(&client, "test-user-b-cognito-sub").await;
    let w2 = start_walk(&client, "test-user-b-cognito-sub", &d2).await;

    // User A records encounter
    let body = record_encounter(&client, "test-token", &w1, &w2).await;
    assert!(
        body["errors"].is_null(),
        "Expected no errors, got: {:?}",
        body
    );

    let encounters = body["data"]["recordEncounter"].as_array().unwrap();
    assert_eq!(encounters.len(), 1, "Expected 1 encounter for 1 dog pair");

    let enc = &encounters[0];
    assert!(enc["id"].as_str().is_some());
    assert_eq!(enc["durationSec"].as_i64().unwrap(), 30);

    // Confirm dog pair is correct (dog_id_1 < dog_id_2 ordering)
    let dog1_id = enc["dog1"]["id"].as_str().unwrap();
    let dog2_id = enc["dog2"]["id"].as_str().unwrap();
    assert!(
        (dog1_id == d1 && dog2_id == d2) || (dog1_id == d2 && dog2_id == d1),
        "Expected D1 and D2, got {} and {}",
        dog1_id,
        dog2_id
    );
}

#[tokio::test]
async fn test_record_encounter_dedup() {
    // If both devices call recordEncounter, the second call should UPSERT (not error).
    let client = common::test_client().await;

    // Reset encounter detection to enabled for both users (test isolation)
    enable_encounter_detection(&client, "test-token").await;
    enable_encounter_detection(&client, "test-user-b-cognito-sub").await;

    let d1 = create_dog(&client, "test-token").await;
    let w1 = start_walk(&client, "test-token", &d1).await;
    let d2 = create_dog(&client, "test-user-b-cognito-sub").await;
    let w2 = start_walk(&client, "test-user-b-cognito-sub", &d2).await;

    // First call from User A
    let body_a = record_encounter(&client, "test-token", &w1, &w2).await;
    assert!(body_a["errors"].is_null(), "A's call failed: {:?}", body_a);

    // Second call from User B (same encounter, reversed walk IDs)
    let body_b = record_encounter(&client, "test-user-b-cognito-sub", &w2, &w1).await;
    assert!(body_b["errors"].is_null(), "B's call failed: {:?}", body_b);

    // Should still be 1 encounter (not duplicated)
    let body_friends = common::graphql_as(
        &client,
        &common::USER_A,
        &format!(
            r#"{{ dogFriends(dogId: "{}") {{ id encounterCount }} }}"#,
            d1
        ),
    )
    .await;
    assert!(
        body_friends["errors"].is_null(),
        "dogFriends query failed: {:?}",
        body_friends
    );
    let friends = body_friends["data"]["dogFriends"].as_array().unwrap();
    assert_eq!(friends.len(), 1);
    assert_eq!(
        friends[0]["encounterCount"].as_i64().unwrap(),
        1,
        "Should still be 1 encounter after dedup"
    );
}

#[tokio::test]
async fn test_record_encounter_multi_dog_walk() {
    // User A has 2 dogs in one walk, User B has 1 dog → should create 2 encounters
    let client = common::test_client().await;

    // Reset encounter detection to enabled for both users (test isolation)
    enable_encounter_detection(&client, "test-token").await;
    enable_encounter_detection(&client, "test-user-b-cognito-sub").await;

    let d1 = create_dog(&client, "test-token").await;
    let d2 = create_dog(&client, "test-token").await;

    // User A starts walk with both dogs
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(
                r#"mutation {{ startWalk(dogIds: ["{}", "{}"]) {{ id }} }}"#,
                d1, d2
            )
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    let w1 = body["data"]["startWalk"]["id"]
        .as_str()
        .unwrap()
        .to_string();

    let d3 = create_dog(&client, "test-user-b-cognito-sub").await;
    let w2 = start_walk(&client, "test-user-b-cognito-sub", &d3).await;

    // Record encounter: should create 2 pairs (D1-D3, D2-D3)
    let body = record_encounter(&client, "test-token", &w1, &w2).await;
    assert!(body["errors"].is_null(), "Got errors: {:?}", body);

    let encounters = body["data"]["recordEncounter"].as_array().unwrap();
    assert_eq!(
        encounters.len(),
        2,
        "Expected 2 encounters for 2-dog walk, got {:?}",
        encounters
    );
}

// ─── Opt-out Test ────────────────────────────────────────────────────────

/// Unique tokens for the opt-out test to avoid cross-test contamination
const USER_OPTOUT_A: &str = "test-optout-user-a";
const USER_OPTOUT_B: &str = "test-optout-user-b";

#[tokio::test]
async fn test_encounter_detection_disabled() {
    let client = common::test_client().await;

    // Reset encounter detection to enabled at start
    enable_encounter_detection(&client, USER_OPTOUT_A).await;
    enable_encounter_detection(&client, USER_OPTOUT_B).await;

    let d1 = create_dog(&client, USER_OPTOUT_A).await;
    let w1 = start_walk(&client, USER_OPTOUT_A, &d1).await;
    let d2 = create_dog(&client, USER_OPTOUT_B).await;
    let w2 = start_walk(&client, USER_OPTOUT_B, &d2).await;

    // User B opts out
    let opt_out = client
        .post("/graphql")
        .header("Authorization", format!("Bearer {}", USER_OPTOUT_B))
        .json(&serde_json::json!({
            "query": r#"mutation { updateEncounterDetection(enabled: false) { encounterDetectionEnabled } }"#
        }))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap();
    assert!(opt_out["errors"].is_null(), "Opt-out failed: {:?}", opt_out);
    assert!(
        !opt_out["data"]["updateEncounterDetection"]["encounterDetectionEnabled"]
            .as_bool()
            .unwrap()
    );

    // User A tries to record encounter with opted-out User B
    let body = record_encounter(&client, USER_OPTOUT_A, &w1, &w2).await;
    assert!(
        body["errors"].is_array() && !body["errors"].as_array().unwrap().is_empty(),
        "Expected error when other user has opted out, got: {:?}",
        body
    );
}

// ─── Friends Query Tests ─────────────────────────────────────────────────

#[tokio::test]
async fn test_dog_friends_after_encounter() {
    let client = common::test_client().await;

    // Reset encounter detection to enabled for both users (test isolation)
    enable_encounter_detection(&client, "test-token").await;
    enable_encounter_detection(&client, "test-user-b-cognito-sub").await;

    let d1 = create_dog(&client, "test-token").await;
    let w1 = start_walk(&client, "test-token", &d1).await;
    let d2 = create_dog(&client, "test-user-b-cognito-sub").await;
    let w2 = start_walk(&client, "test-user-b-cognito-sub", &d2).await;

    record_encounter(&client, "test-token", &w1, &w2).await;

    // D1 should now have D2 as a friend
    let body = common::graphql_as(
        &client,
        &common::USER_A,
        &format!(
            r#"{{ dogFriends(dogId: "{}") {{
                id encounterCount totalInteractionSec firstMetAt lastMetAt
                friend {{ id name }}
            }} }}"#,
            d1
        ),
    )
    .await;
    assert!(body["errors"].is_null(), "Got errors: {:?}", body);

    let friends = body["data"]["dogFriends"].as_array().unwrap();
    assert_eq!(friends.len(), 1);

    let f = &friends[0];
    assert_eq!(f["encounterCount"].as_i64().unwrap(), 1);
    assert_eq!(f["totalInteractionSec"].as_i64().unwrap(), 30);
    assert_eq!(f["friend"]["id"].as_str().unwrap(), d2);
}

#[tokio::test]
async fn test_dog_encounters_history() {
    let client = common::test_client().await;

    // Reset encounter detection to enabled for both users (test isolation)
    enable_encounter_detection(&client, "test-token").await;
    enable_encounter_detection(&client, "test-user-b-cognito-sub").await;

    let d1 = create_dog(&client, "test-token").await;
    let w1 = start_walk(&client, "test-token", &d1).await;
    let d2 = create_dog(&client, "test-user-b-cognito-sub").await;
    let w2 = start_walk(&client, "test-user-b-cognito-sub", &d2).await;

    record_encounter(&client, "test-token", &w1, &w2).await;

    let body = common::graphql_as(
        &client,
        &common::USER_A,
        &format!(
            r#"{{ dogEncounters(dogId: "{}") {{
                id durationSec metAt
                dog1 {{ id }} dog2 {{ id }}
            }} }}"#,
            d1
        ),
    )
    .await;
    assert!(body["errors"].is_null(), "Got errors: {:?}", body);

    let encounters = body["data"]["dogEncounters"].as_array().unwrap();
    assert_eq!(encounters.len(), 1);
    assert_eq!(encounters[0]["durationSec"].as_i64().unwrap(), 30);
}

/// Phase 9: field-wise validation — both invalid UUIDs should produce
/// extensions.fields with 2 entries (myWalkId + theirWalkId), not just the first.
#[tokio::test]
async fn test_record_encounter_invalid_both_uuids_returns_field_errors() {
    let client = common::test_client().await;

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation {
                recordEncounter(myWalkId: "not-a-uuid", theirWalkId: "also-not-a-uuid") {
                    id
                }
            }"#
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();

    // Must have errors
    assert!(
        body["errors"].is_array(),
        "expected errors array, got: {:?}",
        body
    );

    // The error must contain extensions.fields with both field errors
    let err = &body["errors"][0];
    let fields = &err["extensions"]["fields"];
    assert!(
        fields.is_array(),
        "expected extensions.fields array, got: {:?}",
        err
    );
    let fields_arr = fields.as_array().unwrap();
    assert_eq!(
        fields_arr.len(),
        2,
        "expected 2 field errors (myWalkId + theirWalkId), got: {:?}",
        fields_arr
    );

    // Verify field names are present
    let field_names: Vec<&str> = fields_arr
        .iter()
        .filter_map(|e| e["field"].as_str())
        .collect();
    assert!(
        field_names.contains(&"myWalkId"),
        "expected myWalkId in fields, got: {:?}",
        field_names
    );
    assert!(
        field_names.contains(&"theirWalkId"),
        "expected theirWalkId in fields, got: {:?}",
        field_names
    );
}
