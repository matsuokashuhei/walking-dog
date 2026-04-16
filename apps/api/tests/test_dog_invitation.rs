#[allow(unused)]
mod support;
use support::{graphql_as, USER_A, USER_B};

/// Helper: create a dog and return its ID.
async fn create_dog(client: &support::TestClient) -> String {
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
    let client = support::test_client().await;
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
    let client = support::test_client().await;
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
async fn test_invitation_expires_within_24_hours() {
    let client = support::test_client().await;
    let dog_id = create_dog(&client).await;

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(
                r#"mutation {{ generateDogInvitation(dogId: "{}") {{ expiresAt }} }}"#,
                dog_id
            )
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    let expires_at_str = body["data"]["generateDogInvitation"]["expiresAt"]
        .as_str()
        .unwrap();
    let expires_at = chrono::DateTime::parse_from_rfc3339(expires_at_str).unwrap();
    let now = chrono::Utc::now();
    let diff = expires_at.signed_duration_since(now);

    // Should be approximately 24 hours (allow 5 minutes tolerance)
    assert!(
        diff.num_hours() <= 24 && diff.num_hours() >= 23,
        "Expected expiry within ~24 hours, got {} hours",
        diff.num_hours()
    );
}

#[tokio::test]
async fn test_accept_invitation_already_member() {
    let client = support::test_client().await;
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

#[tokio::test]
async fn test_accept_invitation_invalid_token() {
    let client = support::test_client().await;

    // Try to accept with a non-existent token
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { acceptDogInvitation(token: "nonexistent-token-abc123") { id name } }"#,
    )
    .await;
    assert!(
        body["errors"].is_array(),
        "Expected error for invalid token, got: {:?}",
        body
    );
    let err_msg = body["errors"][0]["message"].as_str().unwrap();
    assert!(
        err_msg.contains("not found"),
        "Expected 'not found' error, got: {}",
        err_msg
    );
}

#[tokio::test]
async fn test_non_owner_cannot_generate_invitation() {
    let client = support::test_client().await;

    // User A creates a dog
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "NonOwnerInvDog" }) { id } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();

    // Invite User B
    let body = graphql_as(
        &client,
        &USER_A,
        &format!(
            r#"mutation {{ generateDogInvitation(dogId: "{}") {{ token }} }}"#,
            dog_id
        ),
    )
    .await;
    let token = body["data"]["generateDogInvitation"]["token"]
        .as_str()
        .unwrap();

    // User B accepts (becomes member)
    graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ acceptDogInvitation(token: "{}") {{ id }} }}"#,
            token
        ),
    )
    .await;

    // User B (member, not owner) tries to generate invitation
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ generateDogInvitation(dogId: "{}") {{ token }} }}"#,
            dog_id
        ),
    )
    .await;
    assert!(
        body["errors"].is_array(),
        "Non-owner should not be able to generate invitation, got: {:?}",
        body
    );
}

#[tokio::test]
async fn test_non_member_cannot_generate_invitation() {
    let client = support::test_client().await;

    // User A creates a dog
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "StrangerInvDog" }) { id } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();

    // User B (not a member at all) tries to generate invitation
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ generateDogInvitation(dogId: "{}") {{ token }} }}"#,
            dog_id
        ),
    )
    .await;
    assert!(
        body["errors"].is_array(),
        "Non-member should not be able to generate invitation, got: {:?}",
        body
    );
}
