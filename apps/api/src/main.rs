use std::net::SocketAddr;

use async_graphql::{EmptySubscription, Schema, http::GraphiQLSource};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::{
    Router,
    extract::State,
    http::StatusCode,
    middleware,
    response::{Html, IntoResponse},
    routing::get,
};
use migration::{Migrator, MigratorTrait};
use tokio::net::TcpListener;
use tracing::info;
use walking_dog::{
    auth,
    config::{self, DatabaseLogConfig},
    db,
    entity::user,
    graphql::{self, mutation, query::Query},
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let log_config = config::ApiLogConfig::from_env();
    config::init_tracing(&log_config)?;
    run_migrations(log_config.database_log_config()).await?;
    let schema = graphql::build_schema().await?;
    let app = Router::new()
        .route("/graphql", get(graphql_playground).post(graphql_handler))
        .route_layer(middleware::from_fn_with_state(
            schema.clone(),
            auth::autenticate_user,
        ))
        .route("/health", get(|| async { StatusCode::OK }))
        .with_state(schema);
    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    axum::serve(TcpListener::bind(addr).await.unwrap(), app).await?;
    Ok(())
}

async fn graphql_handler(
    State(schema): State<Schema<Query, mutation::Mutation, EmptySubscription>>,
    user: Option<axum::Extension<user::Model>>,
    request: GraphQLRequest,
) -> GraphQLResponse {
    let mut request = request.into_inner();
    if let Some(axum::Extension(user)) = user {
        request = request.data(user);
    }
    schema.execute(request).await.into()
}

async fn graphql_playground() -> impl IntoResponse {
    Html(GraphiQLSource::build().finish())
}

async fn run_migrations(database_log_config: DatabaseLogConfig) -> anyhow::Result<()> {
    let db = db::connect_database_from_env(database_log_config).await?;
    info!("Running database migrations");
    Migrator::up(&db, None).await?;
    info!("Database migrations applied");
    Ok(())
}
