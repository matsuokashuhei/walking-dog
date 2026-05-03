use async_graphql::Context;
use aws_sdk_dynamodb::types::AttributeValue;
use seaography::{CustomFields, async_graphql};

use super::types::{
    TrackPointBasic, normalize_query_limit, track_point_from_item, track_points_table_name,
    validate_walk_id,
};

pub struct Operations;

#[CustomFields]
impl Operations {
    async fn track_points_by_walk_id(
        ctx: &Context<'_>,
        walk_id: String,
        limit: Option<i32>,
    ) -> async_graphql::Result<Vec<TrackPointBasic>> {
        validate_walk_id(&walk_id)?;
        let limit = normalize_query_limit(limit)?;
        let client = ctx.data::<aws_sdk_dynamodb::Client>()?;
        let table_name = track_points_table_name();

        let output = client
            .query()
            .table_name(table_name)
            .key_condition_expression("walk_id = :walk_id")
            .expression_attribute_values(":walk_id", AttributeValue::S(walk_id))
            .scan_index_forward(true)
            .limit(limit)
            .send()
            .await
            .map_err(|e| async_graphql::Error::new(format!("failed to query track_points: {e}")))?;

        output
            .items
            .unwrap_or_default()
            .into_iter()
            .map(track_point_from_item)
            .collect()
    }
}
