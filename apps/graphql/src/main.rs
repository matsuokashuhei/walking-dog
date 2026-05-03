use async_graphql::{
    dynamic::Schema,
    http::{GraphQLPlaygroundConfig, playground_source},
};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::{
    Router,
    extract::State,
    response::{self, IntoResponse},
    routing::get,
};
use seaography::async_graphql;
use tokio::net::TcpListener;

async fn graphql_playground() -> impl IntoResponse {
    let endpoint = "http://localhost:3000/graphql";
    response::Html(playground_source(GraphQLPlaygroundConfig::new(endpoint)))
}

async fn graphql_handler(State(schema): State<Schema>, req: GraphQLRequest) -> GraphQLResponse {
    let req = req.into_inner();
    schema.execute(req).await.into()
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_test_writer()
        .init();
    let schema = walking_dog::query_root::build_schema().await.unwrap();
    let app = Router::new()
        .route("/graphql", get(graphql_playground).post(graphql_handler))
        .route("/health", get(|| async { "ok" }))
        .with_state(schema);
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 3000));
    axum::serve(TcpListener::bind(addr).await.unwrap(), app)
        .await
        .unwrap();
}
