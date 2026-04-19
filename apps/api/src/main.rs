use migration::{Migrator, MigratorTrait};
use std::sync::Arc;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use walking_dog_api::auth::jwt::CognitoJwtVerifier;
use walking_dog_api::config::Config;

fn main() {
    dotenvy::dotenv().ok();
    let config = Config::from_env();

    // Sentry must be initialized from a synchronous context so the ClientInitGuard
    // lives across the full tokio runtime and flushes events on drop.
    let _sentry_guard = init_sentry(&config);
    init_tracing();

    let runtime = tokio::runtime::Runtime::new().expect("Failed to build tokio runtime");
    runtime.block_on(run(config));
}

fn init_sentry(config: &Config) -> Option<sentry::ClientInitGuard> {
    let dsn = config.sentry_dsn.clone()?;
    let guard = sentry::init((
        dsn,
        sentry::ClientOptions {
            release: sentry::release_name!(),
            environment: Some(config.sentry_environment.clone().into()),
            traces_sample_rate: config.sentry_traces_sample_rate,
            send_default_pii: false,
            ..Default::default()
        },
    ));
    Some(guard)
}

fn init_tracing() {
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer())
        .with(sentry_tracing::layer())
        .init();
}

async fn run(config: Config) {
    let db = walking_dog_api::db::connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    Migrator::up(&db, None)
        .await
        .expect("Failed to run database migrations");
    tracing::info!("Database migrations completed");

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

    let verifier = Arc::new(CognitoJwtVerifier);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Listening on {}", addr);

    let app = walking_dog_api::build_app(db, dynamo, s3, cognito, config, verifier);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
