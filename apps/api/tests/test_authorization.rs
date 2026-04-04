mod common;
use common::{graphql_as, USER_A, USER_B};

#[tokio::test]
async fn test_non_member_cannot_access_dog() {
    let client = common::test_client().await;

    // User A creates a dog
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "PrivateDog" }) { id } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();

    // User B (not a member) tries to query the dog
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(r#"{{ dog(id: "{}") {{ id name }} }}"#, dog_id),
    )
    .await;
    let is_inaccessible = body["data"]["dog"].is_null() || body["errors"].is_array();
    assert!(
        is_inaccessible,
        "Non-member should not access dog, got: {:?}",
        body
    );
}

#[tokio::test]
async fn test_non_member_cannot_start_walk_with_others_dog() {
    let client = common::test_client().await;

    // User A creates a dog
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "WalkAuthDog" }) { id } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();

    // User B (not a member) tries to start a walk with this dog
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id status }} }}"#,
            dog_id
        ),
    )
    .await;
    assert!(
        body["errors"].is_array(),
        "Non-member should not start walk with others' dog, got: {:?}",
        body
    );
}

#[tokio::test]
async fn test_non_member_cannot_view_dog_walk_stats() {
    let client = common::test_client().await;

    // User A creates a dog
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "StatsDog" }) { id } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();

    // User B (not a member) tries to get walk stats
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"{{ dogWalkStats(dogId: "{}", period: "All") {{ totalWalks totalDistanceM }} }}"#,
            dog_id
        ),
    )
    .await;
    assert!(
        body["errors"].is_array(),
        "Non-member should not view walk stats, got: {:?}",
        body
    );
}

#[tokio::test]
async fn test_owner_cannot_remove_self_via_remove_member() {
    let client = common::test_client().await;

    // User A creates a dog
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "SelfRemoveDog" }) { id } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();

    // Get User A's user ID
    let body = graphql_as(&client, &USER_A, r#"{ me { id } }"#).await;
    let user_a_id = body["data"]["me"]["id"].as_str().unwrap();

    // User A tries to remove themselves via removeDogMember
    let body = graphql_as(
        &client,
        &USER_A,
        &format!(
            r#"mutation {{ removeDogMember(dogId: "{}", userId: "{}") }}"#,
            dog_id, user_a_id
        ),
    )
    .await;
    assert!(
        body["errors"].is_array(),
        "Owner should not be able to remove self via removeDogMember, got: {:?}",
        body
    );
    let err_msg = body["errors"][0]["message"].as_str().unwrap();
    assert!(
        err_msg.contains("Cannot remove yourself"),
        "Expected 'Cannot remove yourself' error, got: {}",
        err_msg
    );
}

#[tokio::test]
async fn test_member_can_leave_dog() {
    let client = common::test_client().await;

    // User A creates a dog
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "LeaveDog" }) { id } }"#,
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

    // User B accepts
    graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ acceptDogInvitation(token: "{}") {{ id }} }}"#,
            token
        ),
    )
    .await;

    // User B leaves the dog
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(r#"mutation {{ leaveDog(dogId: "{}") }}"#, dog_id),
    )
    .await;
    assert_eq!(
        body["data"]["leaveDog"], true,
        "Member should be able to leave, got: {:?}",
        body
    );

    // User B can no longer access the dog
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(r#"{{ dog(id: "{}") {{ id }} }}"#, dog_id),
    )
    .await;
    let is_inaccessible = body["data"]["dog"].is_null() || body["errors"].is_array();
    assert!(
        is_inaccessible,
        "User B should not access dog after leaving: {:?}",
        body
    );
}

#[tokio::test]
async fn test_non_member_cannot_leave_dog() {
    let client = common::test_client().await;

    // User A creates a dog
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "CantLeaveDog" }) { id } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();

    // User B (not a member) tries to leave the dog
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(r#"mutation {{ leaveDog(dogId: "{}") }}"#, dog_id),
    )
    .await;
    assert!(
        body["errors"].is_array(),
        "Non-member should not be able to leave dog, got: {:?}",
        body
    );
}

#[tokio::test]
async fn test_member_can_update_dog() {
    let client = common::test_client().await;

    // User A creates a dog
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "EditableDog" }) { id name } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"].as_str().unwrap();
    assert_eq!(
        body["data"]["createDog"]["name"].as_str().unwrap(),
        "EditableDog"
    );

    // User A generates an invitation
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

    // User B accepts the invitation (becomes a member)
    graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ acceptDogInvitation(token: "{}") {{ id }} }}"#,
            token
        ),
    )
    .await;

    // User B (member, not owner) updates the dog's name
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ updateDog(id: "{}", input: {{ name: "RenamedDog" }}) {{ id name }} }}"#,
            dog_id
        ),
    )
    .await;
    assert!(
        body["errors"].is_null(),
        "Member should be able to update dog, got: {:?}",
        body
    );
    assert_eq!(
        body["data"]["updateDog"]["name"].as_str().unwrap(),
        "RenamedDog",
        "Dog name should be updated to RenamedDog"
    );
}
