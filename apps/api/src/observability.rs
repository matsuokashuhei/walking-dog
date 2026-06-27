use std::borrow::Cow;

use sentry::integrations::tracing::EventFilter;
use tracing_subscriber::{filter::LevelFilter, prelude::*};

pub fn init() -> sentry::ClientInitGuard {
    let sentry_guard = sentry::init((sentry_dsn(), sentry_options()));
    let sentry_layer = sentry::integrations::tracing::layer()
        .event_filter(|metadata| sentry_event_filter(metadata.level()));

    tracing_subscriber::registry()
        .with(LevelFilter::INFO)
        .with(tracing_subscriber::fmt::layer())
        .with(sentry_layer)
        .init();

    sentry_guard
}

pub fn sentry_event_filter(level: &tracing::Level) -> EventFilter {
    match *level {
        tracing::Level::ERROR => EventFilter::Event,
        _ => EventFilter::Ignore,
    }
}

fn sentry_options() -> sentry::ClientOptions {
    sentry::ClientOptions {
        release: sentry::release_name!(),
        environment: non_empty_env("SENTRY_ENVIRONMENT").map(Cow::Owned),
        ..Default::default()
    }
}

fn sentry_dsn() -> Option<String> {
    non_empty_env("SENTRY_DSN")
}

fn non_empty_env(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
}
