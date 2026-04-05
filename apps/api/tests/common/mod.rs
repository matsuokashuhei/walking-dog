use std::net::SocketAddr;
use tokio::net::TcpListener;

pub struct TestClient {
    client: reqwest::Client,
    base_url: String,
}

impl TestClient {
    #[allow(dead_code)]
    pub fn post(&self, path: &str) -> reqwest::RequestBuilder {
        self.client.post(format!("{}{}", self.base_url, path))
    }

    #[allow(dead_code)]
    pub fn get(&self, path: &str) -> reqwest::RequestBuilder {
        self.client.get(format!("{}{}", self.base_url, path))
    }

    /// Get the base URL for this test client.
    #[allow(dead_code)]
    pub fn base_url(&self) -> &str {
        &self.base_url
    }
}

pub async fn test_client() -> TestClient {
    std::env::set_var("TEST_MODE", "true");
    let config = walking_dog_api::config::Config::from_env();

    let db = walking_dog_api::db::connect(&config.database_url)
        .await
        .expect("Failed to connect to test DB");

    // Run migrations
    use sea_orm_migration::MigratorTrait;
    migration::Migrator::up(&db, None)
        .await
        .expect("Failed to run migrations");

    let dynamo = walking_dog_api::aws::client::build_dynamo_client(
        &config.aws_region,
        config.dynamodb_endpoint_url.as_deref(),
    )
    .await;
    let s3 = walking_dog_api::aws::client::build_s3_client(
        &config.aws_region,
        config.s3_endpoint_url.as_deref(),
    )
    .await;
    let cognito = walking_dog_api::aws::client::build_cognito_client(
        &config.aws_region,
        config.cognito_endpoint_url.as_deref(),
    )
    .await;

    let app = walking_dog_api::build_app(db, dynamo, s3, cognito, config);

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr: SocketAddr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    TestClient {
        client: reqwest::Client::new(),
        base_url: format!("http://{}", addr),
    }
}

/// Helper to make GraphQL requests as a specific user.
/// In TEST_MODE, the Bearer token value is used as the cognito_sub.
/// "test-token" maps to the default "test-user-cognito-sub" user.
#[allow(dead_code)]
pub struct UserToken(pub &'static str);

#[allow(dead_code)]
pub const USER_A: UserToken = UserToken("test-token");
#[allow(dead_code)]
pub const USER_B: UserToken = UserToken("test-user-b-cognito-sub");

/// Helper to send a GraphQL request as a specific user.
#[allow(dead_code)]
pub async fn graphql_as(
    client: &TestClient,
    user: &UserToken,
    query: &str,
) -> serde_json::Value {
    let res = client
        .post("/graphql")
        .header("Authorization", format!("Bearer {}", user.0))
        .json(&serde_json::json!({ "query": query }))
        .send()
        .await
        .unwrap();
    res.json().await.unwrap()
}
