mod common;

/// Helper: enable encounter detection for a user.
async fn enable_detection(client: &common::TestClient, token: &'static str) {
    let body = common::graphql_as(
        client,
        &common::UserToken(token),
        r#"mutation { updateEncounterDetection(enabled: true) { encounterDetectionEnabled } }"#,
    )
    .await;
    assert!(body["errors"].is_null(), "Enable detection failed: {:?}", body);
}

/// Helper: create a dog as user and return its ID.
async fn create_dog(client: &common::TestClient, token: &'static str) -> String {
    let body = common::graphql_as(
        client,
        &common::UserToken(token),
        r#"mutation { createDog(input: { name: "FlowDog" }) { id } }"#,
    )
    .await;
    body["data"]["createDog"]["id"]
        .as_str()
        .unwrap()
        .to_string()
}

/// Helper: start a walk and return walk ID.
async fn start_walk(client: &common::TestClient, token: &'static str, dog_id: &str) -> String {
    let body = common::graphql_as(
        client,
        &common::UserToken(token),
        &format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id),
    )
    .await;
    body["data"]["startWalk"]["id"]
        .as_str()
        .unwrap()
        .to_string()
}

/// Helper: record encounter and return response body.
async fn record_encounter(
    client: &common::TestClient,
    token: &'static str,
    my_walk: &str,
    their_walk: &str,
) -> serde_json::Value {
    common::graphql_as(
        client,
        &common::UserToken(token),
        &format!(
            r#"mutation {{ recordEncounter(myWalkId: "{}", theirWalkId: "{}") {{
                id durationSec metAt dog1 {{ id }} dog2 {{ id }}
            }} }}"#,
            my_walk, their_walk
        ),
    )
    .await
}

/// Full encounter → friendship → re-encounter → opt-out flow.
/// Uses unique user tokens to avoid cross-test contamination.
const FLOW_USER_A: &str = "flow-test-user-a";
const FLOW_USER_B: &str = "flow-test-user-b";

#[tokio::test]
async fn test_full_encounter_flow() {
    let client = common::test_client().await;

    // 1. Setup: ensure encounter detection is on for both users
    enable_detection(&client, FLOW_USER_A).await;
    enable_detection(&client, FLOW_USER_B).await;

    // 2. Create dogs
    let d1 = create_dog(&client, FLOW_USER_A).await;
    let d2 = create_dog(&client, FLOW_USER_B).await;

    // 3. First walk: both users start walking
    let w1a = start_walk(&client, FLOW_USER_A, &d1).await;
    let w2a = start_walk(&client, FLOW_USER_B, &d2).await;

    // 4. User A records encounter
    let body = record_encounter(&client, FLOW_USER_A, &w1a, &w2a).await;
    assert!(body["errors"].is_null(), "First encounter failed: {:?}", body);
    let encounters = body["data"]["recordEncounter"].as_array().unwrap();
    assert_eq!(encounters.len(), 1, "Expected 1 encounter pair");

    // 5. User B records same encounter (dedup)
    let body_b = record_encounter(&client, FLOW_USER_B, &w2a, &w1a).await;
    assert!(body_b["errors"].is_null(), "Dedup call failed: {:?}", body_b);

    // 6. Verify friendship: encounter_count should be 1 (deduped)
    let friends = common::graphql_as(
        &client,
        &common::UserToken(FLOW_USER_A),
        &format!(
            r#"{{ dogFriends(dogId: "{}") {{ id encounterCount totalInteractionSec firstMetAt lastMetAt friend {{ id name }} }} }}"#,
            d1
        ),
    )
    .await;
    assert!(friends["errors"].is_null(), "dogFriends failed: {:?}", friends);
    let friends_list = friends["data"]["dogFriends"].as_array().unwrap();
    assert_eq!(friends_list.len(), 1, "Expected 1 friend");
    assert_eq!(friends_list[0]["encounterCount"].as_i64().unwrap(), 1);
    assert_eq!(friends_list[0]["friend"]["id"].as_str().unwrap(), d2);

    // 7. Second walk: re-encounter increases count
    let w1b = start_walk(&client, FLOW_USER_A, &d1).await;
    let w2b = start_walk(&client, FLOW_USER_B, &d2).await;
    let body2 = record_encounter(&client, FLOW_USER_A, &w1b, &w2b).await;
    assert!(body2["errors"].is_null(), "Second encounter failed: {:?}", body2);

    // 8. Verify friendship: encounter_count should now be 2
    let friends2 = common::graphql_as(
        &client,
        &common::UserToken(FLOW_USER_A),
        &format!(
            r#"{{ dogFriends(dogId: "{}") {{ encounterCount totalInteractionSec }} }}"#,
            d1
        ),
    )
    .await;
    let f2 = &friends2["data"]["dogFriends"].as_array().unwrap()[0];
    assert_eq!(f2["encounterCount"].as_i64().unwrap(), 2);
    assert_eq!(f2["totalInteractionSec"].as_i64().unwrap(), 60); // 30 * 2

    // 9. Verify encounter history has 2 records
    let history = common::graphql_as(
        &client,
        &common::UserToken(FLOW_USER_A),
        &format!(
            r#"{{ dogEncounters(dogId: "{}") {{ id durationSec metAt }} }}"#,
            d1
        ),
    )
    .await;
    assert!(history["errors"].is_null(), "dogEncounters failed: {:?}", history);
    let enc_list = history["data"]["dogEncounters"].as_array().unwrap();
    assert_eq!(enc_list.len(), 2, "Expected 2 encounters in history");

    // 10. User B opts out
    let opt_out = common::graphql_as(
        &client,
        &common::UserToken(FLOW_USER_B),
        r#"mutation { updateEncounterDetection(enabled: false) { encounterDetectionEnabled } }"#,
    )
    .await;
    assert!(opt_out["errors"].is_null(), "Opt-out failed: {:?}", opt_out);

    // 11. Third walk: encounter should be rejected
    let w1c = start_walk(&client, FLOW_USER_A, &d1).await;
    let w2c = start_walk(&client, FLOW_USER_B, &d2).await;
    let body3 = record_encounter(&client, FLOW_USER_A, &w1c, &w2c).await;
    assert!(
        body3["errors"].is_array() && !body3["errors"].as_array().unwrap().is_empty(),
        "Expected error when B has opted out, got: {:?}",
        body3
    );

    // 12. Verify encounter_count stayed at 2
    let friends3 = common::graphql_as(
        &client,
        &common::UserToken(FLOW_USER_A),
        &format!(
            r#"{{ dogFriends(dogId: "{}") {{ encounterCount }} }}"#,
            d1
        ),
    )
    .await;
    let f3 = &friends3["data"]["dogFriends"].as_array().unwrap()[0];
    assert_eq!(
        f3["encounterCount"].as_i64().unwrap(),
        2,
        "Count should stay at 2 after opt-out rejection"
    );
}
