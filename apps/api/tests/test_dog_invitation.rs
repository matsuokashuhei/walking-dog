mod common;

/// Helper: create a dog and return its ID.
async fn create_dog(client: &common::TestClient) -> String {
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "InvDog" }) { id } }"#
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
async fn test_create_invitation() {
    let client = common::test_client().await;
    let dog_id = create_dog(&client).await;

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(
                r#"mutation {{ generateDogInvitation(dogId: "{}") {{ id dogId token expiresAt }} }}"#,
                dog_id
            )
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    let inv = &body["data"]["generateDogInvitation"];
    assert!(inv["id"].is_string(), "got: {:?}", body);
    assert_eq!(inv["dogId"].as_str().unwrap(), dog_id);
    assert!(inv["token"].is_string());
    assert!(inv["expiresAt"].is_string());
}

#[tokio::test]
async fn test_invitation_token_length() {
    let client = common::test_client().await;
    let dog_id = create_dog(&client).await;

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(
                r#"mutation {{ generateDogInvitation(dogId: "{}") {{ token }} }}"#,
                dog_id
            )
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    let token = body["data"]["generateDogInvitation"]["token"]
        .as_str()
        .unwrap();
    // 16 bytes = 32 hex chars
    assert_eq!(token.len(), 32, "Token should be 32 chars, got: {}", token);
}

#[tokio::test]
async fn test_accept_invitation_already_member() {
    let client = common::test_client().await;
    let dog_id = create_dog(&client).await;

    // Generate invitation
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(
                r#"mutation {{ generateDogInvitation(dogId: "{}") {{ token }} }}"#,
                dog_id
            )
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    let token = body["data"]["generateDogInvitation"]["token"]
        .as_str()
        .unwrap();

    // Try to accept as the same user (already owner/member)
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(
                r#"mutation {{ acceptDogInvitation(token: "{}") {{ id name }} }}"#,
                token
            )
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert!(
        body["errors"].is_array(),
        "Expected error for already member, got: {:?}",
        body
    );
    let err_msg = body["errors"][0]["message"].as_str().unwrap();
    assert!(
        err_msg.contains("already a member"),
        "Expected 'already a member' error, got: {}",
        err_msg
    );
}
