use std::time::Duration;

use async_graphql::Context;
use aws_sdk_dynamodb::types::{PutRequest, WriteRequest};
use seaography::{
    BuilderContext, CustomFields, CustomInputType, CustomOutputType, async_graphql,
    async_graphql::dynamic::{Field, FieldFuture, InputValue},
};

use super::types::{
    MAX_BATCH_WRITE_POINTS, TrackPointBasic, TrackPointCreateInput, track_points_table_name,
};

const MAX_BATCH_WRITE_ATTEMPTS: usize = 3;

pub struct Operations;

impl Operations {
    async fn track_points_create_one(
        ctx: &Context<'_>,
        data: TrackPointCreateInput,
    ) -> async_graphql::Result<TrackPointBasic> {
        let validated = data.validate()?;
        let output = validated.output.clone();
        let client = ctx.data::<aws_sdk_dynamodb::Client>()?;
        let table_name = track_points_table_name();

        client
            .put_item()
            .table_name(table_name)
            .set_item(Some(validated.into_item()))
            .send()
            .await
            .map_err(|e| async_graphql::Error::new(format!("failed to put track_point: {e}")))?;

        Ok(output)
    }

    async fn track_points_create_batch(
        ctx: &Context<'_>,
        data: Vec<TrackPointCreateInput>,
    ) -> async_graphql::Result<Vec<TrackPointBasic>> {
        if data.is_empty() || data.len() > MAX_BATCH_WRITE_POINTS {
            return Err(async_graphql::Error::new(format!(
                "data must contain between 1 and {MAX_BATCH_WRITE_POINTS} track points"
            )));
        }

        let validated = data
            .into_iter()
            .map(TrackPointCreateInput::validate)
            .collect::<async_graphql::Result<Vec<_>>>()?;
        let outputs = validated
            .iter()
            .map(|point| point.output.clone())
            .collect::<Vec<_>>();

        let mut write_requests = validated
            .into_iter()
            .map(|point| {
                WriteRequest::builder()
                    .put_request(
                        PutRequest::builder()
                            .set_item(Some(point.into_item()))
                            .build()
                            .expect("track point put request should be valid"),
                    )
                    .build()
            })
            .collect::<Vec<_>>();
        let client = ctx.data::<aws_sdk_dynamodb::Client>()?;
        let table_name = track_points_table_name();

        for attempt in 1..=MAX_BATCH_WRITE_ATTEMPTS {
            let output = client
                .batch_write_item()
                .request_items(table_name.clone(), write_requests)
                .send()
                .await
                .map_err(|e| {
                    async_graphql::Error::new(format!("failed to batch write track_points: {e}"))
                })?;

            let mut unprocessed_items = output.unprocessed_items.unwrap_or_default();
            write_requests = unprocessed_items.remove(&table_name).unwrap_or_default();
            if write_requests.is_empty() {
                return Ok(outputs);
            }

            if attempt < MAX_BATCH_WRITE_ATTEMPTS {
                tokio::time::sleep(Duration::from_millis(50 * attempt as u64)).await;
            }
        }

        Err(async_graphql::Error::new(format!(
            "failed to write {} track_points",
            write_requests.len()
        )))
    }
}

impl CustomFields for Operations {
    fn to_fields(context: &'static BuilderContext) -> Vec<Field> {
        vec![
            Field::new(
                "trackPointsCreateOne",
                TrackPointBasic::gql_output_type_ref(context),
                move |ctx| {
                    FieldFuture::new(async move {
                        let data =
                            TrackPointCreateInput::parse_value(context, ctx.args.get("data"))
                                .map_err(|e| {
                                    async_graphql::Error::new(format!(
                                        "Error decoding trackPointsCreateOne argument data: {e}"
                                    ))
                                })?;
                        let output = Self::track_points_create_one(ctx.ctx, data).await?;
                        Ok(TrackPointBasic::gql_field_value(output, context))
                    })
                },
            )
            .argument(InputValue::new(
                "data",
                TrackPointCreateInput::gql_input_type_ref(context),
            )),
            Field::new(
                "trackPointsCreateBatch",
                Vec::<TrackPointBasic>::gql_output_type_ref(context),
                move |ctx| {
                    FieldFuture::new(async move {
                        let data = Vec::<TrackPointCreateInput>::parse_value(
                            context,
                            ctx.args.get("data"),
                        )
                        .map_err(|e| {
                            async_graphql::Error::new(format!(
                                "Error decoding trackPointsCreateBatch argument data: {e}"
                            ))
                        })?;
                        let output = Self::track_points_create_batch(ctx.ctx, data).await?;
                        Ok(Vec::<TrackPointBasic>::gql_field_value(output, context))
                    })
                },
            )
            .argument(InputValue::new(
                "data",
                Vec::<TrackPointCreateInput>::gql_input_type_ref(context),
            )),
        ]
    }
}
