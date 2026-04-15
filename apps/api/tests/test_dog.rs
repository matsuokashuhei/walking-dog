mod common;

#[tokio::test]
async fn test_create_dog() {
    let client = common::test_client().await;
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation {
                createDog(input: {
                    name: "Pochi",
                    breed: "Shiba",
                    gender: "male",
                    birthDate: { year: 2020, month: 4 }
                }) { id name breed gender birthDate { year month day } }
            }"#
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 200);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        body["data"]["createDog"]["name"], "Pochi",
        "got: {:?}",
        body
    );
    assert_eq!(body["data"]["createDog"]["birthDate"]["year"], 2020);
    assert_eq!(body["data"]["createDog"]["birthDate"]["month"], 4);
    assert!(body["data"]["createDog"]["birthDate"]["day"].is_null());
}

#[tokio::test]
async fn test_update_dog() {
    let client = common::test_client().await;
    // Create dog first
    let create_res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "Hachi" }) { id } }"#
        }))
        .send()
        .await
        .unwrap();
    let create_body: serde_json::Value = create_res.json().await.unwrap();
    let dog_id = create_body["data"]["createDog"]["id"].as_str().unwrap();

    // Update
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ updateDog(id: "{}", input: {{ name: "Hachi Updated" }}) {{ id name }} }}"#, dog_id)
        }))
        .send().await.unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        body["data"]["updateDog"]["name"], "Hachi Updated",
        "got: {:?}",
        body
    );
}

#[tokio::test]
async fn test_delete_dog() {
    let client = common::test_client().await;
    let create_res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "DeleteMe" }) { id } }"#
        }))
        .send()
        .await
        .unwrap();
    let create_body: serde_json::Value = create_res.json().await.unwrap();
    let dog_id = create_body["data"]["createDog"]["id"].as_str().unwrap();

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
}

#[tokio::test]
async fn test_generate_dog_photo_upload_url() {
    let client = common::test_client().await;
    // 犬を作成
    let create_res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "PhotoDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap();
    let create_body: serde_json::Value = create_res.json().await.unwrap();
    let dog_id = create_body["data"]["createDog"]["id"].as_str().unwrap();

    // プレサインドURL取得
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(
                r#"mutation {{ generateDogPhotoUploadUrl(dogId: "{}", contentType: "image/png") {{ url key expiresAt }} }}"#,
                dog_id
            )
        }))
        .send().await.unwrap();
    assert_eq!(res.status(), 200);
    let body: serde_json::Value = res.json().await.unwrap();
    let url = body["data"]["generateDogPhotoUploadUrl"]["url"]
        .as_str()
        .unwrap();
    assert!(
        url.starts_with("http"),
        "URL should be an HTTP URL, got: {}",
        url
    );
    let key = body["data"]["generateDogPhotoUploadUrl"]["key"]
        .as_str()
        .unwrap();
    assert!(
        key.ends_with(".png"),
        "key should end with .png, got: {}",
        key
    );
    assert!(body["data"]["generateDogPhotoUploadUrl"]["expiresAt"].is_string());
}

#[tokio::test]
async fn test_generate_dog_photo_upload_url_rejects_invalid_content_type() {
    let client = common::test_client().await;
    // 犬を作成
    let create_res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "PhotoDogReject" }) { id } }"#
        }))
        .send()
        .await
        .unwrap();
    let create_body: serde_json::Value = create_res.json().await.unwrap();
    let dog_id = create_body["data"]["createDog"]["id"].as_str().unwrap();

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(
                r#"mutation {{ generateDogPhotoUploadUrl(dogId: "{}", contentType: "application/pdf") {{ url key expiresAt }} }}"#,
                dog_id
            )
        }))
        .send().await.unwrap();
    assert_eq!(res.status(), 200);
    let body: serde_json::Value = res.json().await.unwrap();
    assert!(
        body["errors"].is_array(),
        "expected GraphQL errors array, got: {:?}",
        body
    );
    let msg = body["errors"][0]["message"].as_str().unwrap_or("");
    assert!(
        msg.contains("Unsupported content type"),
        "expected 'Unsupported content type' error, got: {}",
        msg
    );
}

#[tokio::test]
async fn test_walk_stats() {
    let client = common::test_client().await;
    // 犬を作成
    let create_res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "StatsDog" }) { id } }"#
        }))
        .send()
        .await
        .unwrap();
    let create_body: serde_json::Value = create_res.json().await.unwrap();
    let dog_id = create_body["data"]["createDog"]["id"].as_str().unwrap();

    // dogWalkStats はゼロ件で正常に返る (top-level query)
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"{{ dogWalkStats(dogId: "{}", period: "All") {{ totalWalks totalDistanceM totalDurationSec }} }}"#, dog_id)
        }))
        .send().await.unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        body["data"]["dogWalkStats"]["totalWalks"], 0,
        "got: {:?}",
        body
    );
    assert_eq!(body["data"]["dogWalkStats"]["totalDistanceM"], 0);
}
