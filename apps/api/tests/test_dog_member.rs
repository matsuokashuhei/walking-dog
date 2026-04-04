mod common;

/// Helper: create a dog and return its ID.
async fn create_dog(client: &common::TestClient) -> String {
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "MemberDog" }) { id } }"#
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
async fn test_create_dog_creates_owner_membership() {
    let client = common::test_client().await;
    let dog_id = create_dog(&client).await;

    // The dog query should succeed (proves membership exists)
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"{{ dog(id: "{}") {{ id name }} }}"#, dog_id)
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        body["data"]["dog"]["id"].as_str().unwrap(),
        dog_id,
        "got: {:?}",
        body
    );
}

#[tokio::test]
async fn test_get_dogs_by_member() {
    let client = common::test_client().await;
    let dog_id = create_dog(&client).await;

    // me.dogs should include the created dog
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"{ me { dogs { id name } } }"#
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    let dogs = body["data"]["me"]["dogs"].as_array().unwrap();
    let found = dogs.iter().any(|d| d["id"].as_str().unwrap() == dog_id);
    assert!(found, "Dog {} not found in me.dogs: {:?}", dog_id, body);
}

#[tokio::test]
async fn test_update_dog_by_member() {
    let client = common::test_client().await;
    let dog_id = create_dog(&client).await;

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(
                r#"mutation {{ updateDog(id: "{}", input: {{ name: "Updated" }}) {{ id name }} }}"#,
                dog_id
            )
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        body["data"]["updateDog"]["name"], "Updated",
        "got: {:?}",
        body
    );
}

#[tokio::test]
async fn test_delete_dog_owner_only() {
    let client = common::test_client().await;
    let dog_id = create_dog(&client).await;

    // Owner can delete
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ deleteDog(id: "{}") }}"#, dog_id)
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["data"]["deleteDog"], true, "got: {:?}", body);

    // Dog should no longer be accessible
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"{{ dog(id: "{}") {{ id }} }}"#, dog_id)
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    // Should return error (not found) or null
    let is_null_or_error = body["data"]["dog"].is_null() || body["errors"].is_array();
    assert!(
        is_null_or_error,
        "Expected null or error, got: {:?}",
        body
    );
}
