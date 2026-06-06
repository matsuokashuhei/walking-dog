use std::{collections::HashMap, sync::Arc};

use anyhow::anyhow;
use async_trait::async_trait;
use aws_sdk_dynamodb::{
    operation::{batch_write_item::BatchWriteItemError, put_item::PutItemError, query::QueryError},
    types::{AttributeValue, PutRequest, WriteRequest},
};
use chrono::{DateTime, Utc};
use tokio::time::{Duration, sleep};
use tracing::{error, warn};
use uuid::Uuid;

use crate::{entity, util::distance::DistancePoint};

const DYNAMO_BATCH_WRITE_MAX: usize = 25;
const BATCH_WRITE_MAX_RETRIES: u32 = 3;
const TRACK_POINT_TABLE_ENV: &str = "AWS_DYNAMODB_TABLE_TRACK_POINT";

pub type SharedTrackPointRepository = Arc<dyn TrackPointRepository>;

#[derive(Clone, Debug, PartialEq)]
pub struct TrackPoint {
    pub walk_id: Uuid,
    pub tracked_at: DateTime<Utc>,
    pub latitude: f64,
    pub longitude: f64,
}

impl TrackPoint {
    pub fn new(walk_id: Uuid, tracked_at: DateTime<Utc>, latitude: f64, longitude: f64) -> Self {
        Self {
            walk_id,
            tracked_at,
            latitude,
            longitude,
        }
    }
}

impl DistancePoint for TrackPoint {
    fn latitude(&self) -> f64 {
        self.latitude
    }

    fn longitude(&self) -> f64 {
        self.longitude
    }
}

impl From<entity::track_point::Model> for TrackPoint {
    fn from(model: entity::track_point::Model) -> Self {
        Self::new(
            model.walk_id,
            model.tracked_at,
            model.latitude,
            model.longitude,
        )
    }
}

impl From<TrackPoint> for entity::track_point::Model {
    fn from(point: TrackPoint) -> Self {
        Self::new(
            point.walk_id,
            point.tracked_at,
            point.latitude,
            point.longitude,
        )
    }
}

#[async_trait]
pub trait TrackPointRepository: Send + Sync + 'static {
    async fn put(&self, point: &TrackPoint) -> Result<(), TrackPointRepositoryError>;

    async fn batch_put(&self, points: &[TrackPoint]) -> Result<(), TrackPointRepositoryError>;

    async fn find_by_walk_id_and_tracked_at(
        &self,
        walk_id: Uuid,
        tracked_at: DateTime<Utc>,
    ) -> Result<Option<TrackPoint>, TrackPointRepositoryError>;

    async fn find_all_by_walk_id(
        &self,
        walk_id: Uuid,
    ) -> Result<Vec<TrackPoint>, TrackPointRepositoryError>;
}

#[derive(Clone)]
pub struct DynamoDbTrackPointRepository {
    client: aws_sdk_dynamodb::Client,
    table_name: String,
}

impl DynamoDbTrackPointRepository {
    pub fn new(
        client: aws_sdk_dynamodb::Client,
        table_name: impl Into<String>,
    ) -> Result<Self, TrackPointRepositoryError> {
        let table_name = table_name.into();
        if table_name.is_empty() {
            return Err(TrackPointRepositoryError::MissingTableName);
        }
        Ok(Self { client, table_name })
    }

    pub fn from_env(client: aws_sdk_dynamodb::Client) -> Result<Self, TrackPointRepositoryError> {
        let table_name = std::env::var(TRACK_POINT_TABLE_ENV)
            .map_err(|_| TrackPointRepositoryError::MissingTableName)?;
        Self::new(client, table_name)
    }

    fn item_for(point: &TrackPoint) -> HashMap<String, AttributeValue> {
        HashMap::from([
            (
                "walk_id".to_string(),
                AttributeValue::S(point.walk_id.to_string()),
            ),
            (
                "tracked_at".to_string(),
                AttributeValue::N(point.tracked_at.timestamp_micros().to_string()),
            ),
            (
                "latitude".to_string(),
                AttributeValue::N(point.latitude.to_string()),
            ),
            (
                "longitude".to_string(),
                AttributeValue::N(point.longitude.to_string()),
            ),
        ])
    }

    fn write_request_for(point: &TrackPoint) -> WriteRequest {
        WriteRequest::builder()
            .put_request(
                PutRequest::builder()
                    .set_item(Some(Self::item_for(point)))
                    .build()
                    .expect("PutRequest build should not fail"),
            )
            .build()
    }

    fn point_from_item(
        attributes: &HashMap<String, AttributeValue>,
    ) -> Result<TrackPoint, TrackPointRepositoryError> {
        let walk_id = attributes
            .get("walk_id")
            .and_then(|value| match value {
                AttributeValue::S(value) => Uuid::parse_str(value).ok(),
                other => {
                    error!("Expected walk_id to be a string, got {:?}", other);
                    None
                }
            })
            .ok_or_else(|| invalid_item("Invalid or missing walk_id"))?;

        let tracked_at = attributes
            .get("tracked_at")
            .and_then(|value| match value {
                AttributeValue::N(value) => value.parse::<i64>().ok(),
                other => {
                    error!("Expected tracked_at to be a number, got {:?}", other);
                    None
                }
            })
            .and_then(DateTime::from_timestamp_micros)
            .ok_or_else(|| invalid_item("Invalid or missing tracked_at"))?;

        let latitude = number_attribute(attributes, "latitude")?;
        let longitude = number_attribute(attributes, "longitude")?;

        Ok(TrackPoint::new(walk_id, tracked_at, latitude, longitude))
    }
}

#[async_trait]
impl TrackPointRepository for DynamoDbTrackPointRepository {
    async fn put(&self, point: &TrackPoint) -> Result<(), TrackPointRepositoryError> {
        self.client
            .put_item()
            .table_name(&self.table_name)
            .set_item(Some(Self::item_for(point)))
            .send()
            .await
            .map_err(|error| TrackPointRepositoryError::PutItem(error.into_service_error()))?;
        Ok(())
    }

    async fn batch_put(&self, points: &[TrackPoint]) -> Result<(), TrackPointRepositoryError> {
        if points.is_empty() {
            return Ok(());
        }

        for chunk in points.chunks(DYNAMO_BATCH_WRITE_MAX) {
            let write_requests = chunk
                .iter()
                .map(Self::write_request_for)
                .collect::<Vec<_>>();
            let mut unprocessed = Some(write_requests);

            for attempt in 0..=BATCH_WRITE_MAX_RETRIES {
                let requests = match unprocessed.take() {
                    Some(requests) if !requests.is_empty() => requests,
                    _ => break,
                };

                let output = self
                    .client
                    .batch_write_item()
                    .request_items(&self.table_name, requests)
                    .send()
                    .await
                    .map_err(|error| {
                        TrackPointRepositoryError::BatchWriteItem(error.into_service_error())
                    })?;

                let remaining = output
                    .unprocessed_items()
                    .and_then(|items| items.get(&self.table_name))
                    .cloned()
                    .unwrap_or_default();

                if remaining.is_empty() {
                    break;
                }

                if attempt == BATCH_WRITE_MAX_RETRIES {
                    error!(
                        remaining_count = remaining.len(),
                        "batch_put: unprocessed track points remain after max retries"
                    );
                    return Err(TrackPointRepositoryError::UnprocessedItems {
                        remaining_count: remaining.len(),
                        max_retries: BATCH_WRITE_MAX_RETRIES,
                    });
                }

                warn!(
                    attempt,
                    remaining_count = remaining.len(),
                    "batch_put: retrying unprocessed track points"
                );
                sleep(Duration::from_millis(100 * 2u64.pow(attempt))).await;
                unprocessed = Some(remaining);
            }
        }

        Ok(())
    }

    async fn find_by_walk_id_and_tracked_at(
        &self,
        walk_id: Uuid,
        tracked_at: DateTime<Utc>,
    ) -> Result<Option<TrackPoint>, TrackPointRepositoryError> {
        let output = self
            .client
            .query()
            .table_name(&self.table_name)
            .key_condition_expression("walk_id = :walk_id AND tracked_at = :tracked_at")
            .expression_attribute_values(":walk_id", AttributeValue::S(walk_id.to_string()))
            .expression_attribute_values(
                ":tracked_at",
                AttributeValue::N(tracked_at.timestamp_micros().to_string()),
            )
            .send()
            .await
            .map_err(|error| TrackPointRepositoryError::Query(error.into_service_error()))?;

        let Some(item) = output.items().first() else {
            warn!(
                "No track point found for walk_id {} at tracked_at {}",
                walk_id, tracked_at
            );
            return Ok(None);
        };
        Self::point_from_item(item).map(Some)
    }

    async fn find_all_by_walk_id(
        &self,
        walk_id: Uuid,
    ) -> Result<Vec<TrackPoint>, TrackPointRepositoryError> {
        let output = self
            .client
            .query()
            .table_name(&self.table_name)
            .key_condition_expression("walk_id = :walk_id")
            .expression_attribute_values(":walk_id", AttributeValue::S(walk_id.to_string()))
            .send()
            .await
            .map_err(|error| TrackPointRepositoryError::Query(error.into_service_error()))?;

        output
            .items()
            .iter()
            .map(Self::point_from_item)
            .collect::<Result<Vec<_>, _>>()
    }
}

fn number_attribute(
    attributes: &HashMap<String, AttributeValue>,
    key: &'static str,
) -> Result<f64, TrackPointRepositoryError> {
    attributes
        .get(key)
        .and_then(|value| match value {
            AttributeValue::N(value) => value.parse::<f64>().ok(),
            other => {
                error!("Expected {key} to be a number, got {:?}", other);
                None
            }
        })
        .ok_or_else(|| invalid_item(format!("Invalid or missing {key}")))
}

fn invalid_item(message: impl Into<String>) -> TrackPointRepositoryError {
    TrackPointRepositoryError::InvalidItem(anyhow!(message.into()))
}

#[derive(Debug, thiserror::Error)]
pub enum TrackPointRepositoryError {
    #[error("AWS_DYNAMODB_TABLE_TRACK_POINT is not set")]
    MissingTableName,
    #[error("DynamoDB put item failed")]
    PutItem(#[source] PutItemError),
    #[error("DynamoDB batch write failed")]
    BatchWriteItem(#[source] BatchWriteItemError),
    #[error("DynamoDB query failed")]
    Query(#[source] QueryError),
    #[error("DynamoDB item could not be converted to a track point")]
    InvalidItem(#[source] anyhow::Error),
    #[error(
        "DynamoDB batch write left {remaining_count} items unprocessed after {max_retries} retries"
    )]
    UnprocessedItems {
        remaining_count: usize,
        max_retries: u32,
    },
}

#[cfg(test)]
mod tests {
    use std::error::Error as _;

    use super::*;

    #[test]
    fn repository_error_preserves_dynamodb_query_source_chain() {
        #[derive(Debug)]
        struct QueryFailure;

        impl std::fmt::Display for QueryFailure {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "Query failed")
            }
        }

        impl std::error::Error for QueryFailure {}

        let error = TrackPointRepositoryError::Query(QueryError::unhandled(QueryFailure));

        assert!(error.source().is_some());
    }
}
