#[allow(unused)]
mod support;

async fn create_test_dog(client: &support::TestClient) -> String {
    let res = client
        .post("/graphql")
        .header("Authorization", "Bearer test-token")
        .json(&serde_json::json!({
            "query": r#"mutation { createDog(input: { name: "WorkerDog" }) { id } }"#
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
async fn test_walk_points_worker_drains_queue_and_persists_deduped_points() {
    let client = support::test_client().await;
    let dog_id = create_test_dog(&client).await;

    let start_body = support::graphql_as(
        &client,
        &support::USER_A,
        &format!(
            r#"mutation {{ startWalk(dogIds: ["{}"]) {{ id }} }}"#,
            dog_id
        ),
    )
    .await;
    let walk_id = start_body["data"]["startWalk"]["id"].as_str().unwrap();

    let enqueue_body = support::graphql_as(
        &client,
        &support::USER_A,
        &format!(
            r#"mutation {{
                addWalkPoints(walkId: "{}", points: [
                    {{ lat: 35.6762, lng: 139.6503, recordedAt: "2026-03-21T10:00:00Z" }},
                    {{ lat: 35.6769, lng: 139.6509, recordedAt: "2026-03-21T10:00:00Z" }},
                    {{ lat: 35.6763, lng: 139.6504, recordedAt: "2026-03-21T10:00:05Z" }}
                ])
            }}"#,
            walk_id
        ),
    )
    .await;
    assert_eq!(
        enqueue_body["data"]["addWalkPoints"], true,
        "got: {:?}",
        enqueue_body
    );

    let before_drain = support::graphql_as(
        &client,
        &support::USER_A,
        &format!(
            r#"{{ walkPoints(walkId: "{}") {{ lat lng recordedAt }} }}"#,
            walk_id
        ),
    )
    .await;
    let before_points = before_drain["data"]["walkPoints"].as_array().unwrap();
    assert!(
        before_points.is_empty(),
        "walk points should not be persisted before worker drain: {:?}",
        before_drain
    );

    let sqs = client.sqs();
    let dynamo = client.dynamo();
    let result =
        walking_dog_api::services::walk_points_queue_service::drain_walk_points_queue_once(
            &sqs,
            client.walk_points_queue_url(),
            &dynamo,
            client.walk_points_table_name(),
            1,
            10,
        )
        .await
        .unwrap();

    assert_eq!(result.received, 1);
    assert_eq!(result.deleted, 1);
    assert_eq!(result.failed, 0);

    let after_drain = support::graphql_as(
        &client,
        &support::USER_A,
        &format!(
            r#"{{ walkPoints(walkId: "{}") {{ lat lng recordedAt }} }}"#,
            walk_id
        ),
    )
    .await;
    let points = after_drain["data"]["walkPoints"].as_array().unwrap();
    assert_eq!(
        points.len(),
        2,
        "expected deduped points, got: {:?}",
        after_drain
    );
    assert_eq!(points[0]["recordedAt"], "2026-03-21T10:00:00Z");
    assert_eq!(points[0]["lat"], serde_json::json!(35.6769));
    assert_eq!(points[0]["lng"], serde_json::json!(139.6509));
    assert_eq!(points[1]["recordedAt"], "2026-03-21T10:00:05Z");
}
