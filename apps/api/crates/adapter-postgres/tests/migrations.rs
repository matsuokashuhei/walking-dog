use adapter_postgres::{Database, PostgresUrl, migrations::Migrator};
use integration_test_support::PostgresContainer;

#[tokio::test]
async fn empty_baseline_succeeds_twice_against_fresh_postgres() {
    let postgres = PostgresContainer::start()
        .await
        .expect("start isolated PostgreSQL");
    let url = PostgresUrl::parse(postgres.connection_url()).expect("database URL");
    let database = Database::connect(&url).await.expect("connect postgres");

    Migrator::up(&database).await.expect("first migration");
    Migrator::up(&database).await.expect("second migration");

    assert_eq!(
        Migrator::table_names(&database).await.expect("list tables"),
        vec!["_walking_dog_migrations"]
    );
}
