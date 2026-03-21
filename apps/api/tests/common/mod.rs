use std::net::SocketAddr;
use tokio::net::TcpListener;

pub struct TestClient {
    client: reqwest::Client,
    base_url: String,
}

impl TestClient {
    pub fn post(&self, path: &str) -> reqwest::RequestBuilder {
        self.client.post(format!("{}{}", self.base_url, path))
    }

    #[allow(dead_code)]
    pub fn get(&self, path: &str) -> reqwest::RequestBuilder {
        self.client.get(format!("{}{}", self.base_url, path))
    }
}

pub async fn test_client() -> TestClient {
    std::env::set_var("TEST_MODE", "true");
    dotenvy::dotenv().ok();

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
        config.aws_endpoint_url.as_deref(),
    )
    .await;
    let s3 = walking_dog_api::aws::client::build_s3_client(
        &config.aws_region,
        config.aws_endpoint_url.as_deref(),
    )
    .await;

    let app = walking_dog_api::build_app(db, dynamo, s3, config);

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
