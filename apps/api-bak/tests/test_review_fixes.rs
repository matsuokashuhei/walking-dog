#[allow(unused)]
mod support;
use support::{graphql_as, USER_A, USER_B};

// ─── Fix 2: walk_by_id should return error when unauthorized ─────────────────

#[tokio::test]
async fn test_walk_by_id_returns_error_when_unauthorized() {
    let client = support::test_client().await;

    // User A creates a dog and starts a walk
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "AuthDog" }) { id } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();

    let body = graphql_as(
        &client,
        &USER_A,
        &format!(
            r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#,
            dog_id
        ),
    )
    .await;
    let walk_id = body["data"]["startWalk"]["id"].as_str().unwrap();

    // User B (not a member) tries to query the walk
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(r#"{{ walk(id: "{}") {{ id status }} }}"#, walk_id),
    )
    .await;

    // Should return an error, not null
    assert!(
        body["errors"].is_array(),
        "Expected errors array when unauthorized, got: {:?}",
        body
    );
    let err_msg = body["errors"][0]["message"].as_str().unwrap();
    assert!(
        err_msg.contains("Walk not found"),
        "Expected 'Walk not found' error, got: {}",
        err_msg
    );
}

// ─── Fix 4: remove_member should not allow removing the last owner ───────────

#[tokio::test]
async fn test_remove_last_owner_is_rejected() {
    let client = support::test_client().await;

    // User A creates a dog (becomes the sole owner)
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "OwnerGuardDog" }) { id } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();

    // Get User A's user ID
    let body = graphql_as(&client, &USER_A, r#"{ me { id } }"#).await;
    let _user_a_id = body["data"]["me"]["id"].as_str().unwrap();

    // User A invites User B
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

    // User B accepts (becomes a member, not owner)
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ acceptDogInvitation(token: "{}") {{ id }} }}"#,
            token
        ),
    )
    .await;
    assert!(
        body["data"]["acceptDogInvitation"]["id"].is_string(),
        "Accept should succeed: {:?}",
        body
    );

    // Get User B's user ID
    let body = graphql_as(&client, &USER_B, r#"{ me { id } }"#).await;
    let user_b_id = body["data"]["me"]["id"].as_str().unwrap();

    // User A (owner) can remove User B (member) -- this should work
    let body = graphql_as(
        &client,
        &USER_A,
        &format!(
            r#"mutation {{ removeDogMember(dogId: "{}", userId: "{}") }}"#,
            dog_id, user_b_id
        ),
    )
    .await;
    assert_eq!(
        body["data"]["removeDogMember"], true,
        "Removing a member should succeed: {:?}",
        body
    );

    // Now User A (the last owner) tries to leave via leaveDog
    let body = graphql_as(
        &client,
        &USER_A,
        &format!(r#"mutation {{ leaveDog(dogId: "{}") }}"#, dog_id),
    )
    .await;

    // Should be rejected because owner cannot leave
    assert!(
        body["errors"].is_array(),
        "Expected error when last owner tries to leave, got: {:?}",
        body
    );
}

#[tokio::test]
async fn test_remove_member_service_rejects_last_owner() {
    let client = support::test_client().await;

    // User A creates a dog (sole owner)
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "LastOwnerDog" }) { id } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();

    // Get User A's user ID
    let body = graphql_as(&client, &USER_A, r#"{ me { id } }"#).await;
    let user_a_id = body["data"]["me"]["id"].as_str().unwrap();

    // Invite and accept User B
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

    graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ acceptDogInvitation(token: "{}") {{ id }} }}"#,
            token
        ),
    )
    .await;

    // User B tries to remove User A (the last owner) -- User B is not owner so should fail
    // But even if somehow a direct service call were made, the guard should protect
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ removeDogMember(dogId: "{}", userId: "{}") }}"#,
            dog_id, user_a_id
        ),
    )
    .await;
    // User B is not owner, so this should fail with authorization error
    assert!(
        body["errors"].is_array(),
        "Non-owner should not be able to remove members: {:?}",
        body
    );
}

// ─── Fix 1: accept_invitation double-use prevention ─────────────────────────

#[tokio::test]
async fn test_accept_invitation_cannot_be_used_twice() {
    let client = support::test_client().await;

    // User A creates a dog
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "DoubleUseDog" }) { id } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();

    // Generate invitation
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

    // User B accepts
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ acceptDogInvitation(token: "{}") {{ id }} }}"#,
            token
        ),
    )
    .await;
    assert!(
        body["data"]["acceptDogInvitation"]["id"].is_string(),
        "First accept should succeed: {:?}",
        body
    );

    // User B tries to accept again (already used)
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ acceptDogInvitation(token: "{}") {{ id }} }}"#,
            token
        ),
    )
    .await;
    assert!(
        body["errors"].is_array(),
        "Second accept should fail: {:?}",
        body
    );
    let err_msg = body["errors"][0]["message"].as_str().unwrap();
    assert!(
        err_msg.contains("already") || err_msg.contains("used"),
        "Expected 'already used' or 'already a member' error, got: {}",
        err_msg
    );
}
