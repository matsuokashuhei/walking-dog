mod common;

async fn create_test_dog(client: &common::TestClient) -> String {
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "WalkDog" }) { id } }"#
        }))
        .send().await.unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    body["data"]["createDog"]["id"].as_str().unwrap().to_string()
}

#[tokio::test]
async fn test_start_walk() {
    let client = common::test_client().await;
    let dog_id = create_test_dog(&client).await;

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id status dogs {{ id name }} }} }}"#, dog_id)
        }))
        .send().await.unwrap();
    assert_eq!(res.status(), 200);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["data"]["startWalk"]["status"], "ACTIVE", "got: {:?}", body);
    assert_eq!(body["data"]["startWalk"]["dogs"][0]["id"], dog_id);
}

#[tokio::test]
async fn test_start_walk_empty_dogs_returns_error() {
    let client = common::test_client().await;
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { startWalk(dogIds: []) { id } }"#
        }))
        .send().await.unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert!(body["errors"].is_array(), "expected errors, got: {:?}", body);
    let err_msg = body["errors"][0]["message"].as_str().unwrap();
    assert!(err_msg.contains("dogIds") || err_msg.to_lowercase().contains("empty"), "got: {}", err_msg);
}

#[tokio::test]
async fn test_finish_walk() {
    let client = common::test_client().await;
    let dog_id = create_test_dog(&client).await;

    // 散歩開始
    let start_res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
        }))
        .send().await.unwrap();
    let start_body: serde_json::Value = start_res.json().await.unwrap();
    let walk_id = start_body["data"]["startWalk"]["id"].as_str().unwrap();

    // 散歩終了
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ finishWalk(walkId: "{}") {{ id status endedAt }} }}"#, walk_id)
        }))
        .send().await.unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["data"]["finishWalk"]["status"], "FINISHED", "got: {:?}", body);
    assert!(body["data"]["finishWalk"]["endedAt"].is_string());
}

#[tokio::test]
async fn test_my_walks_query() {
    let client = common::test_client().await;
    let dog_id = create_test_dog(&client).await;

    // 散歩を2件作成
    for _ in 0..2 {
        client.post("/graphql")
            .header("Authorization", "Bearer test-token")
            .json(&serde_json::json!({
                "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
            }))
            .send().await.unwrap();
    }

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"{ myWalks { id status dogs { id name } } }"#
        }))
        .send().await.unwrap();
    assert_eq!(res.status(), 200);
    let body: serde_json::Value = res.json().await.unwrap();
    let walks = body["data"]["myWalks"].as_array().unwrap();
    assert!(walks.len() >= 2, "expected >= 2 walks, got: {}", walks.len());
    assert!(walks[0]["dogs"].is_array());
}

#[tokio::test]
async fn test_add_walk_points() {
    let client = common::test_client().await;
    let dog_id = create_test_dog(&client).await;

    let start_res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#, dog_id)
        }))
        .send().await.unwrap();
    let start_body: serde_json::Value = start_res.json().await.unwrap();
    let walk_id = start_body["data"]["startWalk"]["id"].as_str().unwrap();

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{
                addWalkPoints(walkId: "{}", points: [
                    {{ lat: 35.6762, lng: 139.6503, recordedAt: "2026-03-21T10:00:00Z" }},
                    {{ lat: 35.6763, lng: 139.6504, recordedAt: "2026-03-21T10:00:05Z" }}
                ])
            }}"#, walk_id)
        }))
        .send().await.unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["data"]["addWalkPoints"], true, "got: {:?}", body);
}
