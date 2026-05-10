use async_graphql::SimpleObject;

#[derive(SimpleObject, Default, Clone, Debug)]
pub(crate) struct WalkConnectionFields {
    pub(crate) total_count: i64,
    pub(crate) total_distance: i64,
    pub(crate) total_duration: i64,
}
