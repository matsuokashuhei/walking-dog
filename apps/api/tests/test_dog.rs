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
    assert_eq!(body["data"]["createDog"]["name"], "Pochi", "got: {:?}", body);
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
        .send().await.unwrap();
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
    assert_eq!(body["data"]["updateDog"]["name"], "Hachi Updated", "got: {:?}", body);
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
        .send().await.unwrap();
    let create_body: serde_json::Value = create_res.json().await.unwrap();
    let dog_id = create_body["data"]["createDog"]["id"].as_str().unwrap();

    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": format!(r#"mutation {{ deleteDog(id: "{}") }}"#, dog_id)
        }))
        .send().await.unwrap();
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["data"]["deleteDog"], true, "got: {:?}", body);
}
