use super::client::TestClient;
use super::tokens::UserToken;

/// Helper to send a GraphQL request as a specific user.
pub async fn graphql_as(client: &TestClient, user: &UserToken, query: &str) -> serde_json::Value {
    let res = client
        .post("/graphql")
        .header("Authorization", format!("Bearer {}", user.0))
        .json(&serde_json::json!({ "query": query }))
        .send()
        .await
        .unwrap();
    res.json().await.unwrap()
}
