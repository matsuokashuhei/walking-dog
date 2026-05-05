#[allow(unused)]
mod support;
use support::{graphql_as, USER_A, USER_B};

#[tokio::test]
async fn test_sharing_flow() {
    let client = support::test_client().await;

    // 1. User A creates a dog -> auto-owner
    let body = graphql_as(
        &client,
        &USER_A,
        r#"mutation { createDog(input: { name: "ShareDog" }) { id name } }"#,
    )
    .await;
    let dog_id = body["data"]["createDog"]["id"]
        .as_str()
        .unwrap()
        .to_string();
    assert_eq!(body["data"]["createDog"]["name"], "ShareDog");

    // 2. User A generates invitation -> token
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
        .unwrap()
        .to_string();
    assert!(!token.is_empty());

    // 3. User B accepts invitation -> becomes member
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ acceptDogInvitation(token: "{}") {{ id name }} }}"#,
            token
        ),
    )
    .await;
    assert_eq!(
        body["data"]["acceptDogInvitation"]["id"].as_str().unwrap(),
        dog_id,
        "got: {:?}",
        body
    );

    // 4. User B records a walk with the shared dog
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id status }} }}"#,
            dog_id
        ),
    )
    .await;
    let walk_id = body["data"]["startWalk"]["id"]
        .as_str()
        .unwrap()
        .to_string();
    assert_eq!(body["data"]["startWalk"]["status"], "active");

    // Finish the walk
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(
            r#"mutation {{ finishWalk(walkId: "{}", distanceM: 500) {{ id status distanceM }} }}"#,
            walk_id
        ),
    )
    .await;
    assert_eq!(body["data"]["finishWalk"]["status"], "finished");

    // 5. User A's myWalks includes User B's walk (shared dog)
    let body = graphql_as(
        &client,
        &USER_A,
        r#"{ myWalks { id status walker { id } } }"#,
    )
    .await;
    let walks = body["data"]["myWalks"].as_array().unwrap();
    let found = walks.iter().any(|w| w["id"].as_str().unwrap() == walk_id);
    assert!(
        found,
        "User A should see User B's walk in myWalks: {:?}",
        body
    );

    // 6. User A's dogWalkStats includes User B's walk
    let body = graphql_as(
        &client,
        &USER_A,
        &format!(
            r#"{{ dogWalkStats(dogId: "{}", period: "All") {{ totalWalks totalDistanceM }} }}"#,
            dog_id
        ),
    )
    .await;
    assert!(
        body["data"]["dogWalkStats"]["totalWalks"].as_i64().unwrap() >= 1,
        "Stats should include User B's walk: {:?}",
        body
    );
    assert_eq!(
        body["data"]["dogWalkStats"]["totalDistanceM"]
            .as_i64()
            .unwrap(),
        500,
        "Distance should include User B's walk: {:?}",
        body
    );

    // 7. User A removes User B
    // First get User B's user ID
    let body = graphql_as(&client, &USER_B, r#"{ me { id } }"#).await;
    let user_b_id = body["data"]["me"]["id"].as_str().unwrap().to_string();

    let body = graphql_as(
        &client,
        &USER_A,
        &format!(
            r#"mutation {{ removeDogMember(dogId: "{}", userId: "{}") }}"#,
            dog_id, user_b_id
        ),
    )
    .await;
    assert_eq!(body["data"]["removeDogMember"], true, "got: {:?}", body);

    // 8. User B can no longer access the dog
    let body = graphql_as(
        &client,
        &USER_B,
        &format!(r#"{{ dog(id: "{}") {{ id }} }}"#, dog_id),
    )
    .await;
    let is_inaccessible = body["data"]["dog"].is_null() || body["errors"].is_array();
    assert!(
        is_inaccessible,
        "User B should not access dog after removal: {:?}",
        body
    );

    // 9. User B's walk data still exists (User A can see it)
    let body = graphql_as(&client, &USER_A, r#"{ myWalks { id } }"#).await;
    let walks = body["data"]["myWalks"].as_array().unwrap();
    let walk_still_exists = walks.iter().any(|w| w["id"].as_str().unwrap() == walk_id);
    assert!(
        walk_still_exists,
        "User B's walk data should persist after removal: {:?}",
        body
    );
}
