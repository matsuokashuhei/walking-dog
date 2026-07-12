use api_bootstrap::{
    composition,
    config::{Config, ConfigError},
    health::Health,
    observability::{self, SafeEvent, SafeLogError},
    shutdown::Shutdown,
};
use std::{collections::HashMap, net::SocketAddr, time::Duration};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
    sync::oneshot,
};

#[test]
fn configuration_requires_and_types_values() {
    assert_eq!(
        Config::from_values(&HashMap::new()),
        Err(ConfigError::Missing("API_BIND_ADDR"))
    );
    let invalid_bind = values("not-an-address", "postgres://db/kernel");
    assert!(matches!(
        Config::from_values(&invalid_bind),
        Err(ConfigError::InvalidBindAddress(_))
    ));
    let malformed_database = values("127.0.0.1:0", "postgres://missing-host");
    assert!(matches!(
        Config::from_values(&malformed_database),
        Err(ConfigError::InvalidDatabaseUrl(_))
    ));
}

#[tokio::test]
async fn actual_health_is_not_ready_until_dependencies_initialize() {
    let health = Health::new();
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind");
    let address = listener.local_addr().expect("address");
    let shutdown = Shutdown::new();
    let (initialized_tx, initialized_rx) = oneshot::channel();
    let server = tokio::spawn(composition::serve_api_with_initializer(
        listener,
        health,
        shutdown.subscribe(),
        async move { initialized_rx.await.map_err(|_| "initializer dropped") },
    ));

    assert_eq!(http_status(address).await, 503);
    initialized_tx.send(()).expect("initialize");
    wait_for_status(address, 200).await;
    shutdown.trigger();
    server.await.expect("join").expect("serve");
}

#[test]
fn safe_logs_reject_sensitive_fields_and_values() {
    for key in [
        "access_token",
        "otp",
        "email",
        "signed_url",
        "storage_key",
        "idempotency_key",
        "latitude",
    ] {
        assert_eq!(
            SafeEvent::new("started").field(key, "secret"),
            Err(SafeLogError::ForbiddenField)
        );
    }
    assert_eq!(
        SafeEvent::new("started").field("detail", "owner@example.com"),
        Err(SafeLogError::ForbiddenValue)
    );
}

#[test]
fn observability_initialization_reports_duplicate_subscriber() {
    observability::initialize().expect("first subscriber");
    assert!(observability::initialize().is_err());
}

#[tokio::test]
async fn graceful_shutdown_finishes_in_flight_then_stops_accepting() {
    let shutdown = Shutdown::new();
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind");
    let address = listener.local_addr().expect("address");
    let (entered_tx, mut entered_rx) = tokio::sync::mpsc::channel(1);
    let (release_tx, release_rx) = tokio::sync::watch::channel(false);
    let router = axum::Router::new().route(
        "/in-flight",
        axum::routing::get(move || {
            let entered_tx = entered_tx.clone();
            let mut release_rx = release_rx.clone();
            async move {
                let _sent = entered_tx.send(()).await;
                let _released = release_rx.changed().await;
                "finished"
            }
        }),
    );
    let api = tokio::spawn(composition::serve_listener(
        listener,
        router,
        shutdown.subscribe(),
    ));
    let request = tokio::spawn(http_get(address, "/in-flight"));
    entered_rx.recv().await.expect("request accepted");
    shutdown.trigger();
    wait_until_refused(address).await;
    release_tx.send_replace(true);
    assert!(request.await.expect("request join").contains("finished"));
    tokio::time::timeout(Duration::from_secs(1), api)
        .await
        .expect("API timeout")
        .expect("API join")
        .expect("API serve");
}

#[tokio::test]
async fn worker_loop_finishes_after_shutdown() {
    let shutdown = Shutdown::new();
    let worker = tokio::spawn(composition::run_worker_until_shutdown(shutdown.subscribe()));

    shutdown.trigger();

    tokio::time::timeout(Duration::from_secs(1), worker)
        .await
        .expect("worker timeout")
        .expect("worker join");
}

#[tokio::test]
async fn signal_waiter_error_propagates_from_lifecycle() {
    let shutdown = Shutdown::new();
    let operation = std::future::pending::<Result<(), std::convert::Infallible>>();
    let signal = async { Err(std::io::Error::other("signal install failed")) };
    let result = api_bootstrap::shutdown::coordinate_shutdown(shutdown, operation, signal).await;
    assert!(matches!(
        result,
        Err(api_bootstrap::shutdown::LifecycleError::Signal(_))
    ));
}

#[test]
fn bootstrap_schema_has_no_product_fields() {
    assert_eq!(
        composition::schema_sdl(),
        "type Query {\n  schemaRevision: String!\n}\n"
    );
}

fn values(bind: &str, database: &str) -> HashMap<String, String> {
    HashMap::from([
        ("API_BIND_ADDR".to_owned(), bind.to_owned()),
        ("DATABASE_URL".to_owned(), database.to_owned()),
    ])
}

async fn http_status(address: SocketAddr) -> u16 {
    http_get(address, "/health")
        .await
        .split_whitespace()
        .nth(1)
        .expect("status")
        .parse()
        .expect("status number")
}

async fn wait_for_status(address: SocketAddr, expected: u16) {
    tokio::time::timeout(Duration::from_secs(1), async {
        loop {
            if http_status(address).await == expected {
                return;
            }
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("status transition");
}

async fn wait_until_refused(address: SocketAddr) {
    tokio::time::timeout(Duration::from_secs(1), async {
        loop {
            if tokio::net::TcpStream::connect(address).await.is_err() {
                return;
            }
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("listener stop");
}

async fn http_get(address: SocketAddr, path: &str) -> String {
    let mut stream = tokio::net::TcpStream::connect(address)
        .await
        .expect("connect");
    stream
        .write_all(
            format!("GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
                .as_bytes(),
        )
        .await
        .expect("write");
    let mut response = String::new();
    stream.read_to_string(&mut response).await.expect("read");
    response
}
