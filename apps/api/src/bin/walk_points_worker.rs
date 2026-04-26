use std::time::Duration;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use walking_dog_api::config::Config;

const RECEIVE_WAIT_TIME_SECONDS: i32 = 20;
const RECEIVE_MAX_MESSAGES: i32 = 10;

fn main() {
    dotenvy::dotenv().ok();
    let config = Config::from_env();
    config
        .walk_points_queue_url
        .as_deref()
        .expect("SQS_QUEUE_URL_WALK_POINTS must be set");

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
    let queue_url = config
        .walk_points_queue_url
        .clone()
        .expect("SQS_QUEUE_URL_WALK_POINTS must be set");
    let dynamo = walking_dog_api::aws::client::build_dynamo_client(
        &config.aws_region,
        config.dynamodb_endpoint_url.as_deref(),
    )
    .await;
    let sqs = walking_dog_api::aws::client::build_sqs_client(
        &config.aws_region,
        config.sqs_endpoint_url.as_deref(),
    )
    .await;

    tracing::info!(queue_url, "walk points worker started");

    loop {
        match walking_dog_api::services::walk_points_queue_service::drain_walk_points_queue_once(
            &sqs,
            &queue_url,
            &dynamo,
            &config.dynamodb_table_walk_points,
            RECEIVE_WAIT_TIME_SECONDS,
            RECEIVE_MAX_MESSAGES,
        )
        .await
        {
            Ok(result) => {
                if result.received > 0 || result.failed > 0 {
                    tracing::info!(
                        received = result.received,
                        deleted = result.deleted,
                        failed = result.failed,
                        "walk points worker processed batch"
                    );
                }
            }
            Err(error) => {
                tracing::error!(error = %error, "walk points worker iteration failed");
                tokio::time::sleep(Duration::from_secs(1)).await;
            }
        }
    }
}
