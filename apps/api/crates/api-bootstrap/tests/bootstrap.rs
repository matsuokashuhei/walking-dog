use api_bootstrap::{
    composition,
    config::{Config, ConfigError},
    health::Health,
    observability::{SafeEvent, SafeLogError},
    shutdown::Shutdown,
};
use std::{collections::HashMap, time::Duration};

#[test]
fn configuration_requires_and_types_values() {
    let missing = Config::from_values(&HashMap::new());
    assert_eq!(missing, Err(ConfigError::Missing("API_BIND_ADDR")));

    let invalid = Config::from_values(&HashMap::from([
        ("API_BIND_ADDR".to_owned(), "not-an-address".to_owned()),
        ("DATABASE_URL".to_owned(), "postgres://db/kernel".to_owned()),
    ]));
    assert!(matches!(invalid, Err(ConfigError::InvalidBindAddress(_))));
}

#[tokio::test]
async fn health_is_not_ready_until_dependencies_initialize() {
    let health = Health::new();
    assert_eq!(
        health.snapshot().await,
        serde_json::json!({"live": true, "ready": false})
    );
    assert_eq!(
        composition::health_status(&health).await,
        axum::http::StatusCode::SERVICE_UNAVAILABLE
    );
    health.mark_ready().await;
    assert_eq!(
        health.snapshot().await,
        serde_json::json!({"live": true, "ready": true})
    );
    assert_eq!(
        composition::health_status(&health).await,
        axum::http::StatusCode::OK
    );
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

#[tokio::test]
async fn shutdown_finishes_api_and_worker_tasks() {
    let shutdown = Shutdown::new();
    let api = tokio::spawn(composition::serve_api_until_shutdown(
        Health::new(),
        shutdown.subscribe(),
    ));
    let worker = tokio::spawn(composition::run_worker_until_shutdown(shutdown.subscribe()));
    shutdown.trigger();
    tokio::time::timeout(Duration::from_secs(1), api)
        .await
        .expect("API timeout")
        .expect("API join");
    tokio::time::timeout(Duration::from_secs(1), worker)
        .await
        .expect("worker timeout")
        .expect("worker join");
}

#[test]
fn bootstrap_schema_has_no_product_fields() {
    assert_eq!(
        composition::schema_sdl(),
        "type Query {\n  schemaRevision: String!\n}\n"
    );
}
