use adapter_postgres::migrations::{EmptyBaseline, MigrationContract};

#[test]
fn empty_baseline_succeeds_twice_without_product_schema() {
    let mut database = MigrationContract::fresh();
    EmptyBaseline::apply(&mut database).expect("first migration");
    EmptyBaseline::apply(&mut database).expect("second migration");
    assert!(database.product_objects().is_empty());
}
