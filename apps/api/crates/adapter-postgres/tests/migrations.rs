use adapter_postgres::{Database, PostgresUrl, migrations::Migrator};

#[tokio::test]
async fn empty_baseline_succeeds_twice_against_fresh_postgres() {
    let url = PostgresUrl::parse("postgres://postgres:kernel@host.docker.internal:55432/kernel")
        .expect("database URL");
    let database = Database::connect(&url).await.expect("connect postgres");

    Migrator::up(&database).await.expect("first migration");
    Migrator::up(&database).await.expect("second migration");

    assert_eq!(
        Migrator::table_names(&database).await.expect("list tables"),
        vec!["_walking_dog_migrations"]
    );
}
