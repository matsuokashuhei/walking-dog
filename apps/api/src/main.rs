#![recursion_limit = "256"]

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
use axum_extra::{
    TypedHeader,
    headers::{Authorization, authorization::Bearer},
};
use migration::{Migrator, MigratorTrait};
use sea_orm::Database;
use tokio::net::TcpListener;
use tracing::info;
use walking_dog::{
    auth,
    entity::user,
    graphql::{self, mutation, query::Query},
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();
    run_migrations().await?;
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
    authorization: Option<TypedHeader<Authorization<Bearer>>>,
    request: GraphQLRequest,
) -> GraphQLResponse {
    let access_token = authorization
        .map(|TypedHeader(authorization)| graphql::AuthAccessToken::new(authorization.token()));
    let request = graphql::attach_request_context(
        request.into_inner(),
        user.map(|axum::Extension(user)| user),
        access_token,
    );
    schema.execute(request).await.into()
}

async fn graphql_playground() -> impl IntoResponse {
    Html(GraphiQLSource::build().finish())
}

async fn run_migrations() -> anyhow::Result<()> {
    let database_url = std::env::var("DATABASE_URL")?;
    let db = Database::connect(&database_url).await?;
    info!("Running database migrations");
    Migrator::up(&db, None).await?;
    info!("Database migrations applied");
    Ok(())
}
