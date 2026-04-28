use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_sqs::Client as SqsClient;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use uuid::Uuid;
use walking_dog_api::config::Config;

pub struct TestClient {
    client: reqwest::Client,
    base_url: String,
    config: Config,
    dynamo: DynamoClient,
    sqs: SqsClient,
}

impl TestClient {
    pub fn post(&self, path: &str) -> reqwest::RequestBuilder {
        self.client.post(format!("{}{}", self.base_url, path))
    }

    pub fn get(&self, path: &str) -> reqwest::RequestBuilder {
        self.client.get(format!("{}{}", self.base_url, path))
    }

    /// Get the base URL for this test client.
    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    pub fn walk_points_queue_url(&self) -> &str {
        self.config
            .walk_points_queue_url
            .as_deref()
            .expect("walk points queue URL must be set for tests")
    }

    pub fn walk_points_table_name(&self) -> &str {
        &self.config.dynamodb_table_walk_points
    }

    pub fn s3_presign_endpoint_url(&self) -> Option<&str> {
        self.config
            .s3_presign_endpoint_url
            .as_deref()
            .or(self.config.s3_endpoint_url.as_deref())
    }

    pub fn dynamo(&self) -> DynamoClient {
        self.dynamo.clone()
    }

    pub fn sqs(&self) -> SqsClient {
        self.sqs.clone()
    }

    pub async fn receive_walk_points_message_bodies(&self) -> Vec<String> {
        self.sqs
            .receive_message()
            .queue_url(self.walk_points_queue_url())
            .max_number_of_messages(10)
            .wait_time_seconds(1)
            .send()
            .await
            .expect("Failed to receive walk points messages")
            .messages()
            .iter()
            .filter_map(|message| message.body().map(str::to_string))
            .collect()
    }
}

pub async fn test_client() -> TestClient {
    let mut config = walking_dog_api::config::Config::from_env();

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
    let s3_presign_endpoint_url = config
        .s3_presign_endpoint_url
        .as_deref()
        .or(config.s3_endpoint_url.as_deref());
    let s3_presign =
        walking_dog_api::aws::client::build_s3_client(&config.aws_region, s3_presign_endpoint_url)
            .await;
    let cognito = walking_dog_api::aws::client::build_cognito_client(
        &config.aws_region,
        config.cognito_endpoint_url.as_deref(),
    )
    .await;
    let sqs = walking_dog_api::aws::client::build_sqs_client(
        &config.aws_region,
        config.sqs_endpoint_url.as_deref(),
    )
    .await;

    let queue_name = format!("walk-points-test-{}", Uuid::new_v4());
    sqs.create_queue()
        .queue_name(&queue_name)
        .send()
        .await
        .expect("Failed to create SQS queue for test");

    let sqs_endpoint_url = config
        .sqs_endpoint_url
        .as_deref()
        .expect("SQS_ENDPOINT_URL must be set for tests");
    config.walk_points_queue_url = Some(format!(
        "{}/000000000000/{}",
        sqs_endpoint_url.trim_end_matches('/'),
        queue_name
    ));

    // Use NoOpJwtVerifier so integration tests don't need real Cognito tokens.
    // The Bearer token value is used as cognito_sub directly.
    // "test-token" maps to "test-user-cognito-sub" for backwards compatibility.
    let verifier = Arc::new(walking_dog_api::auth::jwt::NoOpJwtVerifier);

    let clients = walking_dog_api::AwsClients {
        dynamo: dynamo.clone(),
        s3,
        s3_presign,
        cognito,
        sqs: sqs.clone(),
    };
    let app = walking_dog_api::build_app(db, clients, config.clone(), verifier);

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr: SocketAddr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    TestClient {
        client: reqwest::Client::new(),
        base_url: format!("http://{}", addr),
        config,
        dynamo,
        sqs,
    }
}
