mod common;
use common::USER_A;

#[tokio::test]
async fn test_me_query() {
    let client = common::test_client().await;
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": "{ me { id displayName } }"
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 200);
    let body: serde_json::Value = res.json().await.unwrap();
    assert!(
        body["data"]["me"]["id"].is_string(),
        "me.id should be string, got: {:?}",
        body
    );
}

#[tokio::test]
async fn test_update_profile_mutation() {
    let client = common::test_client().await;

    // Ensure the user exists first
    client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": "{ me { id } }"
        }))
        .send()
        .await
        .unwrap();

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { updateProfile(input: { displayName: "Taro" }) { id displayName } }"#
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 200);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        body["data"]["updateProfile"]["displayName"], "Taro",
        "got: {:?}",
        body
    );
}

/// Verify that calling the me query twice with the same cognito_sub does not fail.
/// This exercises the upsert conflict path: the second call hits ON CONFLICT DO NOTHING
/// and must still return the existing user row without error.
#[tokio::test]
async fn test_upsert_conflict_returns_existing_user() {
    let client = common::test_client().await;

    // First call: inserts the user
    let body1 = common::graphql_as(&client, &USER_A, "{ me { id } }").await;
    assert!(
        body1["data"]["me"]["id"].is_string(),
        "first call should succeed, got: {:?}",
        body1
    );
    let id1 = body1["data"]["me"]["id"].as_str().unwrap();

    // Second call: same cognito_sub — hits ON CONFLICT DO NOTHING, must still return user
    let body2 = common::graphql_as(&client, &USER_A, "{ me { id } }").await;
    assert!(
        body2["errors"].is_null(),
        "second call should not error on conflict, got: {:?}",
        body2
    );
    let id2 = body2["data"]["me"]["id"].as_str().unwrap();

    assert_eq!(
        id1, id2,
        "both calls must return the same user id, got {} vs {}",
        id1, id2
    );
}
