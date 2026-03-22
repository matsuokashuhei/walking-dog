use walking_dog_api::config::Config;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();
    let config = Config::from_env();

    let db = walking_dog_api::db::connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

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
    let cognito = walking_dog_api::aws::client::build_cognito_client(
        &config.cognito_region,
        config.cognito_endpoint_url.as_deref(),
    )
    .await;

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Listening on {}", addr);

    let app = walking_dog_api::build_app(db, dynamo, s3, cognito, config);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
