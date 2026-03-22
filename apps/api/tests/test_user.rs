mod common;

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
